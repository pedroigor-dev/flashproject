export const runtime = 'nodejs';
export async function GET() {
  try {
    const response = await fetch(`${process.env.FLASH_BACKEND_URL || 'http://127.0.0.1:4000'}/api/health`,{cache:'no-store',signal:AbortSignal.timeout(3000)});
    if (!response.ok) throw new Error('Backend indisponível');
    return Response.json(await response.json(),{headers:{'Cache-Control':'no-store'}});
  } catch { return Response.json({status:'offline',ai:{configured:false}},{status:503}); }
}
