'use client';
import { useEffect, useRef } from 'react';

const vert = `attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}`;

const frag = `precision highp float;
uniform vec2 r;uniform float t;
float hash(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);}
const mat2 m=mat2(1.6,1.2,-1.2,1.6);
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<6;i++){v+=a*noise(p);p=m*p;a*=.5;}return v;}
float fbm3(vec2 p){float v=0.,a=.5;for(int i=0;i<3;i++){v+=a*noise(p);p=m*p;a*=.5;}return v;}
float bank(vec2 p){
 vec2 q=p*vec2(1.25,2.)+vec2(t*.022,0.);
 vec2 w=vec2(fbm3(q*.7+vec2(0.,t*.012)),fbm3(q*.7+vec2(5.2,1.3)-t*.01));
 float n=fbm(q+w*1.3);n=n*n*1.9+.32*(fbm3(q*3.2+w*2.)-.5);
 float top=.27+.05*sin(p.x*1.7+t*.04)+.12*(fbm3(vec2(p.x*1.6+t*.015,1.7))-.5)+.06*smoothstep(.2,.8,noise(vec2(p.x*6.+t*.05,3.5)));
 return n+(top-p.y)*4.6-.55;
}
float wisp(vec2 p){
 vec2 q=p*vec2(1.1,3.2)+vec2(-t*.016,4.);
 float n=fbm(q+fbm3(q*.8+t*.01)*1.2);
 float band=exp(-pow((p.y-.82)/.07,2.))+.7*exp(-pow((p.y-.66)/.05,2.));
 return (n-.5)*band*1.8;
}
vec4 over(vec4 b,vec4 f){return f+b*(1.-f.a);}
void main(){
 vec2 p=gl_FragCoord.xy/r.y;
 vec4 c=vec4(0.);
 float wd=smoothstep(0.,.35,wisp(p));
 float wl=clamp((wisp(p)-wisp(p+vec2(-.02,.03)))*4.+.6,0.,1.);
 vec3 wc=mix(vec3(.93,.89,.93),vec3(1.),wl);
 c=over(c,vec4(wc,1.)*wd*.6);
 float d=bank(p);
 float a=smoothstep(.0,.14,d);
 float lit=clamp((d-bank(p+vec2(-.02,.045)))*1.9+.3,0.,1.);
 float deep=smoothstep(.2,1.4,d);
 vec3 shade=vec3(.89,.47,.64),mid=vec3(.97,.70,.80),hi=vec3(1.,.95,.97);
 vec3 col=mix(shade,mid,smoothstep(.0,.6,lit));
 col=mix(col,hi,smoothstep(.55,1.,lit));
 float white=smoothstep(.52,.78,fbm3(p*vec2(1.3,1.8)+vec2(t*.018,9.)));
 col=mix(col,mix(vec3(.93,.88,.92),vec3(1.),lit),white*.75);
 col=mix(col,shade*.92,deep*(1.-lit)*.35);
 col+=vec3(1.,.75,.85)*pow(1.-a,4.)*a*.6;
 c=over(c,vec4(col,1.)*a);
 float mist=exp(-pow((p.y-.24)/.1,2.))*(.08+.42*smoothstep(.45,.8,fbm(p*vec2(1.4,4.5)+vec2(t*.05,t*.01))));
 mist+=smoothstep(.16,0.,p.y)*.3;
 vec3 mc=mix(vec3(.99,.86,.91),vec3(1.,.97,.98),fbm3(p*3.+t*.03));
 c=over(c,vec4(mc,1.)*clamp(mist,0.,.6));
 float haze=exp(-pow((p.y-.45)/.12,2.))*.18*fbm3(p*vec2(.8,3.)+vec2(t*.03,0.));
 c=over(c,vec4(1.,.92,.95,1.)*haze);
 gl_FragColor=c;
}`;

export default function Clouds() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!;
    const gl = canvas.getContext('webgl', {
      premultipliedAlpha: true,
      alpha: true,
      antialias: false,
    });
    if (!gl || gl.isContextLost()) {
      canvas.classList.add('clouds-fallback');
      return;
    }
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, vert));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, frag));
    gl.bindAttribLocation(prog, 0, 'a');
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      canvas.classList.add('clouds-fallback');
      return;
    }
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const uR = gl.getUniformLocation(prog, 'r'),
      uT = gl.getUniformLocation(prog, 't');
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const scale = Math.min(devicePixelRatio, 1.5) * 0.8;
    const resize = () => {
      canvas.width = Math.round(canvas.clientWidth * scale);
      canvas.height = Math.round(canvas.clientHeight * scale);
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    addEventListener('resize', resize);
    const start = performance.now() - 20000;
    let raf = 0;
    const draw = (now: number) => {
      gl.uniform2f(uR, canvas.width, canvas.height);
      gl.uniform1f(uT, (now - start) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!still) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    const lost = (e: Event) => {
      e.preventDefault();
      cancelAnimationFrame(raf);
      canvas.classList.add('clouds-fallback');
    };
    canvas.addEventListener('webglcontextlost', lost);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener('resize', resize);
      canvas.removeEventListener('webglcontextlost', lost);
    };
  }, []);
  return <canvas ref={ref} className="clouds" aria-hidden="true" />;
}
