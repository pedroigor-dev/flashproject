'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowUpRight,
  ArrowRight,
  ArrowLeft,
  Check,
  ChevronRight,
  Clock3,
  FileText,
  Headphones,
  LifeBuoy,
  LoaderCircle,
  Plus,
  Upload,
  Wallet,
  X,
  Download,
  ShieldCheck,
  MessageCircle,
} from 'lucide-react';
import Brand from '@/components/Brand';
import Flashinho from '@/components/Flashinho';
import {
  Dashboard,
  SupportCase,
  statusLabels,
  money,
  shortDate,
  supportRequest,
} from '@/lib/support';
import styles from './support.module.css';
import RefundTour from './RefundTour';

export default function SupportPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [step, setStep] = useState(1);
  const [transactionId, setTransactionId] = useState('');
  const [reason, setReason] = useState('cancelled');
  const [description, setDescription] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [openChatRequest, setOpenChatRequest] = useState(0);
  const requestKey = useRef('');
  const fileInput = useRef<HTMLInputElement>(null);
  const detailTitle = useRef<HTMLHeadingElement>(null);
  const active = data?.cases.find((item) => item.id === selected);
  const purchase = data?.transactions.find((item) => item.id === transactionId);

  const refresh = useCallback(async () => {
    const result = await supportRequest<Dashboard>();
    setData(result);
  }, []);

  useEffect(() => {
    let stopped = false;
    const load = async () => {
      try {
        const result = await supportRequest<Dashboard>();
        if (!stopped) {
          setData(result);
        }
      } catch (error) {
        if (!stopped) {
          setError(error instanceof Error ? error.message : 'Não foi possível carregar a central.');
        }
      }
    };
    void load();
    const interval = setInterval(() => void load(), 10000);
    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (selected || creating) {
      detailTitle.current?.focus();
    }
  }, [selected, creating, step]);

  function start() {
    setSelected(null);
    setCreating(true);
    setStep(1);
    setDescription('');
    setTransactionId('');
    setConfirmed(false);
    setError('');
    requestKey.current = crypto.randomUUID();
  }

  async function mutate(action: () => Promise<SupportCase>) {
    setBusy(true);
    setError('');
    try {
      const item = await action();
      setData((previous) =>
        previous
          ? {
              ...previous,
              cases: [item, ...previous.cases.filter((existing) => existing.id !== item.id)],
            }
          : previous,
      );
      setSelected(item.id);
      setCreating(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Não foi possível concluir a ação.');
    } finally {
      setBusy(false);
    }
  }

  async function upload(file?: File) {
    if (!file || !active) {
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Escolha um arquivo de até 5 MB.');
      return;
    }
    const body = new FormData();
    body.append('file', file);
    await mutate(() => supportRequest(`/cases/${active.id}/attachments`, { method: 'POST', body }));
    if (fileInput.current) {
      fileInput.current.value = '';
    }
  }

  return (
    <main className={styles.root}>
      <header className={styles.header}>
        <Brand />
        <nav aria-label="Navegação da central">
          <Link href="/">Experiência Flash</Link>
          <Link href="/chat">
            Converse com o Flashinho <ArrowUpRight size={14} />
          </Link>
        </nav>
        <span className={styles.demo}>
          <span /> Ambiente de demonstração
        </span>
      </header>
      <div className={styles.shell}>
        <aside className={styles.sidebar}>
          <div className={styles.spaceLabel}>SEU ESPAÇO</div>
          <button
            className={styles.navActive}
            onClick={() => {
              setSelected(null);
              setCreating(false);
              setError('');
            }}
          >
            <LifeBuoy size={19} /> Central de atendimento <ChevronRight size={15} />
          </button>
          <Link href="/chat" className={styles.navLink}>
            <MessageCircle size={18} /> Conheça o Flashinho <ArrowUpRight size={14} />
          </Link>
          <div className={styles.sidebarCard}>
            <div className={styles.mascot}>
              <Flashinho />
            </div>
            <h3>
              Vamos resolver
              <br />
              um passo de cada vez.
            </h3>
            <p>Entenda o caminho do seu estorno e acompanhe cada atualização.</p>
          </div>
          <div className={styles.privateNote}>
            <ShieldCheck size={17} />
            <p>
              Compras fictícias.
              <br />
              Use apenas arquivos de teste.
            </p>
          </div>
          {data && (
            <small className={styles.systemStatus}>
              Anexos: {data.integrations.storage === 's3' ? 'Amazon S3' : 'armazenamento local'}
              <br />
              Fila: {data.integrations.queue === 'sqs' ? 'Amazon SQS' : 'local'} · n8n{' '}
              {data.integrations.automation ? 'configurado' : 'pendente'}
            </small>
          )}
        </aside>
        <div className={styles.content}>
          <div className={styles.breadcrumb}>
            <span>Seu espaço</span>
            <ChevronRight size={12} />
            Atendimento
            {(active || creating) && (
              <>
                <ChevronRight size={12} />
                <span>Estorno</span>
              </>
            )}
          </div>
          {error && (
            <div className={styles.error} role="alert">
              <span>{error}</span>
              <button aria-label="Fechar aviso" onClick={() => setError('')}>
                <X size={16} />
              </button>
            </div>
          )}
          {!data ? (
            <div className={styles.loading}>
              <LoaderCircle className={styles.spin} /> Preparando sua central…
              {error && (
                <button
                  onClick={() => {
                    setError('');
                    void refresh().catch((error) => setError(error.message));
                  }}
                >
                  Tentar novamente
                </button>
              )}
            </div>
          ) : creating ? (
            <section className={styles.formSection}>
              <button
                className={styles.back}
                onClick={() => (step === 1 ? setCreating(false) : setStep(1))}
              >
                <ArrowLeft size={15} />
                {step === 1 ? 'Voltar para a central' : 'Escolher outra compra'}
              </button>
              <span className={styles.eyebrow}>VAMOS ORGANIZAR ISSO</span>
              <h1 ref={detailTitle} tabIndex={-1}>
                Seu estorno começa aqui<span>.</span>
              </h1>
              <p className={styles.subtitle}>
                Conte o que aconteceu. A gente te mostra o próximo passo.
              </p>
              <div className={styles.steps}>
                <span className={styles.stepActive}>
                  01 <b>A compra</b>
                </span>
                <i />
                <span className={step === 2 ? styles.stepActive : ''}>
                  02 <b>O que aconteceu</b>
                </span>
                <i />
                <span>
                  03 <b>Acompanhar</b>
                </span>
              </div>
              {step === 1 ? (
                <div className={styles.formCard}>
                  <h2>Qual compra precisa de ajuda?</h2>
                  <p>Estas transações são exemplos para você testar o fluxo.</p>
                  <div
                    className={styles.purchaseList}
                    data-refund-tour={transactionId ? undefined : 'purchase'}
                  >
                    {data.transactions.map((tx) => {
                      const existing = data.cases.find((item) => item.transactionId === tx.id);
                      return (
                        <button
                          key={tx.id}
                          className={`${styles.purchase} ${transactionId === tx.id ? styles.purchaseSelected : ''}`}
                          onClick={() =>
                            existing
                              ? (setSelected(existing.id), setCreating(false))
                              : setTransactionId(tx.id)
                          }
                        >
                          <span className={styles.storeAvatar}>{tx.initials}</span>
                          <span className={styles.purchaseInfo}>
                            <strong>{tx.merchant}</strong>
                            <small>
                              {tx.category} · {shortDate(tx.date)}
                              {existing ? ' · Atendimento aberto' : ''}
                            </small>
                          </span>
                          <strong>{money(tx.amount)}</strong>
                          {existing ? (
                            <ChevronRight size={17} />
                          ) : (
                            <span className={styles.radio}>
                              {transactionId === tx.id && <span />}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <div className={styles.formFooter}>
                    <span>
                      <ShieldCheck size={15} /> Nenhuma movimentação real
                    </span>
                    <button
                      className={styles.primary}
                      data-refund-tour={transactionId ? 'purchase' : undefined}
                      disabled={!transactionId}
                      onClick={() => setStep(2)}
                    >
                      Continuar <ArrowRight size={17} />
                    </button>
                  </div>
                </div>
              ) : (
                <form
                  className={styles.formCard}
                  data-refund-tour="details"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void mutate(() =>
                      supportRequest('/cases', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Idempotency-Key': requestKey.current,
                        },
                        body: JSON.stringify({
                          transactionId,
                          reason,
                          description,
                          merchantConfirmed: confirmed,
                        }),
                      }),
                    );
                  }}
                >
                  <div className={styles.chosenPurchase}>
                    <span className={styles.storeAvatar}>{purchase?.initials}</span>
                    <span>
                      <strong>{purchase?.merchant}</strong>
                      <small>{purchase && money(purchase.amount)} · Compra demonstrativa</small>
                    </span>
                    <Check size={18} />
                  </div>
                  <label className={styles.field}>
                    O que aconteceu?
                    <select value={reason} onChange={(event) => setReason(event.target.value)}>
                      <option value="cancelled">A compra foi cancelada</option>
                      <option value="duplicate">Apareceu uma cobrança duplicada</option>
                      <option value="declined">
                        A compra foi recusada, mas o saldo foi debitado
                      </option>
                    </select>
                  </label>
                  <label className={styles.field}>
                    Conte um pouco mais
                    <textarea
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      minLength={10}
                      maxLength={2000}
                      required
                      placeholder="Ex.: a loja confirmou o cancelamento, mas ainda não vi a devolução no extrato."
                    />
                    <small>
                      {description.length}/2000 · Não inclua dados pessoais ou do cartão.
                    </small>
                  </label>
                  <label className={styles.checkbox}>
                    <input
                      type="checkbox"
                      checked={confirmed}
                      onChange={(event) => setConfirmed(event.target.checked)}
                    />
                    <span>O estabelecimento já confirmou o cancelamento.</span>
                  </label>
                  <div className={styles.callout}>
                    <FileText size={19} />
                    <p>
                      O estabelecimento inicia o cancelamento. Se ainda não falou com a loja, tudo
                      bem: vamos guardar seu caso e orientar esse primeiro passo.
                    </p>
                  </div>
                  <div className={styles.formFooter}>
                    <span>Um protocolo para acompanhar tudo.</span>
                    <button
                      className={styles.primary}
                      disabled={busy || description.trim().length < 10}
                    >
                      {busy ? (
                        <LoaderCircle className={styles.spin} size={17} />
                      ) : (
                        <>
                          Abrir atendimento <ArrowUpRight size={17} />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </section>
          ) : active ? (
            <section>
              <button
                className={styles.back}
                onClick={() => {
                  setSelected(null);
                }}
              >
                <ArrowLeft size={15} /> Meus atendimentos
              </button>
              <div className={styles.detailHeading}>
                <div>
                  <span className={styles.eyebrow}>{active.protocol}</span>
                  <h1 ref={detailTitle} tabIndex={-1}>
                    Tudo no seu tempo<span>.</span>
                  </h1>
                  <p className={styles.subtitle}>
                    Você acompanha o caminho. A gente organiza os próximos passos.
                  </p>
                </div>
                <span
                  className={`${styles.status} ${active.status === 'completed' ? styles.complete : ''}`}
                >
                  {active.status === 'completed' ? <Check size={14} /> : <Clock3 size={14} />}
                  {statusLabels[active.status]}
                </span>
              </div>
              <div className={styles.detailGrid}>
                <div>
                  <div className={styles.caseSummary}>
                    <span className={styles.storeAvatar}>{active.transaction.initials}</span>
                    <div>
                      <strong>{active.transaction.merchant}</strong>
                      <small>
                        {shortDate(active.transaction.date)} · {active.transaction.category}
                      </small>
                    </div>
                    <strong>{money(active.transaction.amount)}</strong>
                  </div>
                  <div className={styles.timelineCard}>
                    <div className={styles.cardHeading} data-refund-tour="tracking">
                      <h2>O caminho do seu estorno</h2>
                      <span>ATUALIZADO {shortDate(active.updatedAt)}</span>
                    </div>
                    <ol className={styles.timeline}>
                      {active.events.map((event, index) => (
                        <li key={event.id}>
                          <span
                            className={`${styles.timelineDot} ${index === active.events.length - 1 ? styles.latest : ''}`}
                          >
                            {index < active.events.length - 1 || active.status === 'completed' ? (
                              <Check size={12} />
                            ) : (
                              <span />
                            )}
                          </span>
                          <div>
                            <time>
                              {shortDate(event.at)} ·{' '}
                              {new Date(event.at).toLocaleTimeString('pt-BR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </time>
                            <h3>{event.title}</h3>
                            <p>{event.detail}</p>
                          </div>
                        </li>
                      ))}
                    </ol>
                    {active.status === 'waiting_merchant' && (
                      <button
                        className={styles.primary}
                        disabled={busy}
                        onClick={() =>
                          void mutate(() =>
                            supportRequest(`/cases/${active.id}/merchant`, { method: 'POST' }),
                          )
                        }
                      >
                        A loja confirmou o cancelamento <ArrowRight size={16} />
                      </button>
                    )}
                    {active.status === 'waiting_receipt' && (
                      <div className={styles.uploadBox}>
                        <Upload size={24} />
                        <h3>Vamos guardar o comprovante?</h3>
                        <p>Use um arquivo fictício em PDF, PNG ou JPEG, de até 5 MB.</p>
                        <a
                          className={styles.sampleReceipt}
                          href="/fixtures/comprovante-demo.pdf"
                          download
                        >
                          Baixar um comprovante de teste <Download size={13} />
                        </a>
                        <input
                          ref={fileInput}
                          type="file"
                          accept="application/pdf,image/png,image/jpeg"
                          aria-label="Selecionar comprovante de teste"
                          disabled={busy}
                          onChange={(event) => void upload(event.target.files?.[0])}
                        />
                        {busy && <p role="status">Enviando seu arquivo…</p>}
                      </div>
                    )}
                    {active.status === 'queued' && (
                      <div className={styles.callout}>
                        <Clock3 size={19} />
                        <p>
                          {data.integrations.automation
                            ? 'O comprovante está na fila. A página acompanha a triagem automaticamente.'
                            : 'O comprovante está salvo. A triagem começará quando a integração com o n8n for configurada.'}
                        </p>
                      </div>
                    )}
                    {active.status === 'reviewing' && data.integrations.simulationEnabled && (
                      <div className={styles.simulation}>
                        <p>
                          Quer ver o fluxo até o fim? Simule uma análise aprovada. Isso não
                          movimenta dinheiro.
                        </p>
                        <button
                          className={styles.secondary}
                          disabled={busy}
                          onClick={() =>
                            void mutate(() =>
                              supportRequest(`/cases/${active.id}/simulate`, { method: 'POST' }),
                            )
                          }
                        >
                          Simular conclusão <ArrowRight size={16} />
                        </button>
                      </div>
                    )}
                    {active.status === 'completed' && (
                      <div className={styles.success}>
                        <Check size={20} />
                        <p>
                          Pronto! Você chegou ao fim da demonstração. Nenhum saldo real foi
                          alterado.
                        </p>
                      </div>
                    )}
                  </div>
                  <div className={styles.report}>
                    <h3>Seu relato</h3>
                    <p>{active.description}</p>
                    {active.attachments.map((file) => (
                      <a
                        key={file.id}
                        href={`/api/support/cases/${active.id}/attachments/${file.id}`}
                      >
                        <FileText size={16} />
                        {file.name}
                        <Download size={15} />
                      </a>
                    ))}
                  </div>
                </div>
                <aside className={styles.detailAside}>
                  <div className={styles.helperCard}>
                    <Flashinho />
                    <span className={styles.eyebrow}>UMA AJUDA POR AQUI</span>
                    <h2>Sem ficar no escuro.</h2>
                    <p>
                      O Flashinho pode explicar as etapas e orientar seu próximo passo, considerando
                      este atendimento.
                    </p>
                    <button
                      className={styles.secondary}
                      onClick={() => setOpenChatRequest((value) => value + 1)}
                    >
                      Perguntar ao Flashinho <ArrowUpRight size={15} />
                    </button>
                  </div>
                  <div className={styles.sourceCard}>
                    <FileText size={19} />
                    <h3>Como funciona na prática?</h3>
                    <p>
                      As orientações seguem o guia público de estornos da Flash. Prazos reais
                      dependem do caso e dos participantes do pagamento.
                    </p>
                    <a href={data.guide.url} target="_blank" rel="noreferrer">
                      Consultar guia oficial <ArrowUpRight size={14} />
                    </a>
                  </div>
                </aside>
              </div>
            </section>
          ) : (
            <>
              <section className={styles.hero}>
                <div>
                  <span className={styles.eyebrow}>ESTAMOS POR AQUI</span>
                  <h1>
                    Uma ajuda.
                    <br />
                    Mais tranquilidade<span>.</span>
                  </h1>
                  <p>
                    Do primeiro “o que aconteceu?” até o próximo passo.
                    <br />
                    Seu atendimento, com tudo no mesmo lugar.
                  </p>
                  <button className={styles.primary} onClick={start} data-refund-tour="welcome">
                    Preciso de ajuda com um estorno <ArrowUpRight size={18} />
                  </button>
                </div>
                <div className={styles.heroArt} aria-hidden="true">
                  <div className={styles.artOrbit} />
                  <div className={styles.artOrbitTwo} />
                  <div className={styles.artCard}>
                    <span>flash</span>
                    <div>
                      <Check size={27} />
                    </div>
                    <small>CADA PASSO, MAIS CLARO.</small>
                  </div>
                  <span className={styles.artTag}>
                    <span /> Acompanhe por aqui.
                  </span>
                </div>
              </section>
              <div className={styles.featureGrid}>
                <button onClick={start}>
                  <span className={styles.featureIcon}>
                    <Wallet size={22} />
                  </span>
                  <div>
                    <h2>Precisa de um estorno?</h2>
                    <p>Escolha a compra e conte o que houve.</p>
                  </div>
                  <ArrowUpRight size={19} />
                </button>
                <Link href="/chat">
                  <span className={styles.featureIcon}>
                    <Headphones size={22} />
                  </span>
                  <div>
                    <h2>Vamos conversar?</h2>
                    <p>Tire suas dúvidas com o Flashinho.</p>
                  </div>
                  <ArrowUpRight size={19} />
                </Link>
              </div>
              <section className={styles.casesSection}>
                <div className={styles.sectionTitle}>
                  <div>
                    <span className={styles.eyebrow}>SEM PERDER O FIO</span>
                    <h2>
                      Seus atendimentos<span> {data.cases.length.toString().padStart(2, '0')}</span>
                    </h2>
                  </div>
                  <button onClick={start}>
                    <Plus size={16} /> Novo atendimento
                  </button>
                </div>
                {data.cases.length === 0 ? (
                  <div className={styles.empty}>
                    <span>
                      <FileText size={26} />
                    </span>
                    <div>
                      <h3>Seu próximo passo aparece aqui.</h3>
                      <p>
                        Quando você abrir um atendimento, poderá acompanhar cada atualização neste
                        espaço.
                      </p>
                    </div>
                    <button className={styles.secondary} onClick={start}>
                      Experimentar <ArrowRight size={16} />
                    </button>
                  </div>
                ) : (
                  <div className={styles.caseList}>
                    {data.cases.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          setSelected(item.id);
                          setError('');
                        }}
                      >
                        <span className={styles.storeAvatar}>{item.transaction.initials}</span>
                        <div>
                          <small>{item.protocol}</small>
                          <strong>Estorno · {item.transaction.merchant}</strong>
                          <span>
                            Aberto em {shortDate(item.createdAt)} · {money(item.transaction.amount)}
                          </span>
                        </div>
                        <span
                          className={`${styles.status} ${item.status === 'completed' ? styles.complete : ''}`}
                        >
                          {statusLabels[item.status]}
                        </span>
                        <ChevronRight size={18} />
                      </button>
                    ))}
                  </div>
                )}
              </section>
              <div className={styles.bottomNote}>
                <ShieldCheck size={16} />
                <p>
                  Este é um projeto independente. As compras e os atendimentos são demonstrativos e
                  não se conectam à sua conta Flash.
                </p>
              </div>
            </>
          )}
          <footer className={styles.footer}>
            <span>MENOS DÚVIDAS. MAIS POSSIBILIDADES.</span>
            <span>Projeto conceito independente</span>
          </footer>
        </div>
      </div>
      {data && (
        <RefundTour
          stage={creating ? (step === 1 ? 'purchase' : 'details') : active ? 'tracking' : 'welcome'}
          status={active?.status}
          caseId={active?.id}
          openChatRequest={openChatRequest}
          purchaseSelected={Boolean(transactionId)}
        />
      )}
    </main>
  );
}
