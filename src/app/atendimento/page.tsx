'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  ArrowUpRight,
  ArrowRight,
  ArrowLeft,
  Check,
  ChevronRight,
  Clock3,
  FileText,
  LifeBuoy,
  LoaderCircle,
  Upload,
  X,
  Download,
  ShieldCheck,
  MessageCircle,
} from 'lucide-react';
import Brand from '@/components/Brand';
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

type Action = 'create' | 'confirm' | 'upload' | 'finish';

const pendingLabels: Record<Action, string> = {
  create: 'Abrindo atendimento…',
  confirm: 'Registrando confirmação…',
  upload: 'Enviando comprovante…',
  finish: 'Concluindo simulação…',
};

export default function SupportPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [step, setStep] = useState(1);
  const [transactionId, setTransactionId] = useState('');
  const [reason, setReason] = useState('cancelled');
  const [description, setDescription] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [pending, setPending] = useState<Action | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState('');
  const [openChatRequest, setOpenChatRequest] = useState(0);
  const requestKey = useRef('');
  const fileInput = useRef<HTMLInputElement>(null);
  const detailTitle = useRef<HTMLHeadingElement>(null);
  const actionTitle = useRef<HTMLHeadingElement>(null);
  const errorNotice = useRef<HTMLDivElement>(null);
  const visitedStep = useRef(false);
  const inFlight = useRef(false);
  const revision = useRef(0);
  const focusNextAction = useRef(false);
  const active = data?.cases.find((item) => item.id === selected);
  const purchase = data?.transactions.find((item) => item.id === transactionId);

  const hasQueued = data?.cases.some((item) => item.status === 'queued');

  useEffect(() => {
    const controller = new AbortController();
    void supportRequest<Dashboard>('', { signal: controller.signal })
      .then((result) => {
        if (!controller.signal.aborted) setData(result);
      })
      .catch((failure) => {
        if (!controller.signal.aborted) {
          setError(
            failure instanceof Error ? failure.message : 'Não foi possível carregar a central.',
          );
        }
      });
    return () => controller.abort();
  }, [attempt]);

  useEffect(() => {
    if (!hasQueued) return;
    const controller = new AbortController();
    let nextPoll: ReturnType<typeof setTimeout>;
    async function poll() {
      const atStart = revision.current;
      try {
        const result = await supportRequest<Dashboard>('', { signal: controller.signal });
        if (!controller.signal.aborted && atStart === revision.current && !inFlight.current) {
          setData(result);
        }
      } catch {
        // The next poll can recover without interrupting the current step.
      } finally {
        if (!controller.signal.aborted) nextPoll = setTimeout(poll, 2500);
      }
    }
    nextPoll = setTimeout(poll, 2500);
    return () => {
      controller.abort();
      clearTimeout(nextPoll);
    };
  }, [hasQueued]);

  useEffect(() => {
    if (selected || creating) visitedStep.current = true;
    if (visitedStep.current) detailTitle.current?.focus();
  }, [selected, creating, step]);

  useEffect(() => {
    if (error) errorNotice.current?.focus();
  }, [error]);

  useEffect(() => {
    if (!pending && focusNextAction.current) {
      focusNextAction.current = false;
      actionTitle.current?.focus({ preventScroll: true });
    }
  }, [pending]);

  function start() {
    setSelected(null);
    setCreating(true);
    setStep(1);
    setDescription('');
    setTransactionId('');
    setReason('cancelled');
    setConfirmed(false);
    setError('');
    requestKey.current = crypto.randomUUID();
  }

  async function mutate(type: Action, action: () => Promise<SupportCase>) {
    if (inFlight.current) return;
    inFlight.current = true;
    revision.current += 1;
    setPending(type);
    setError('');
    try {
      const item = await action();
      focusNextAction.current = type !== 'create';
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
      revision.current += 1;
      inFlight.current = false;
      setPending(null);
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
    await mutate('upload', () =>
      supportRequest(`/cases/${active.id}/attachments`, { method: 'POST', body }),
    );
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
            disabled={Boolean(pending)}
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
          <div className={styles.privateNote}>
            <ShieldCheck size={17} />
            <p>
              Compras fictícias.
              <br />
              Use apenas arquivos de teste.
            </p>
          </div>
          {data && (
            <details className={styles.systemStatus}>
              <summary>Integrações da demonstração</summary>
              Anexos: {data.integrations.storage === 's3' ? 'Amazon S3' : 'armazenamento local'}
              <br />
              Fila: {data.integrations.queue === 'sqs' ? 'Amazon SQS' : 'local'} · n8n{' '}
              {data.integrations.automation ? 'configurado' : 'pendente'}
            </details>
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
            <div ref={errorNotice} className={styles.error} role="alert" tabIndex={-1}>
              <span>{error}</span>
              {data && (
                <button aria-label="Fechar aviso" onClick={() => setError('')}>
                  <X size={16} />
                </button>
              )}
            </div>
          )}
          {!data ? (
            error ? (
              <button
                className={styles.secondary}
                onClick={() => {
                  setError('');
                  setAttempt((value) => value + 1);
                }}
              >
                Tentar novamente
              </button>
            ) : (
              <div className={styles.loading} role="status">
                <span>Carregando atendimentos…</span>
                <div aria-hidden="true" className={styles.skeleton}>
                  <i />
                  <i />
                  <i />
                </div>
              </div>
            )
          ) : creating ? (
            <section key="form" className={`${styles.formSection} ${styles.enter}`}>
              <button
                className={styles.back}
                disabled={Boolean(pending)}
                onClick={() => (step === 1 ? setCreating(false) : setStep(1))}
              >
                <ArrowLeft size={15} />
                {step === 1 ? 'Voltar para a central' : 'Escolher outra compra'}
              </button>
              <h1 ref={detailTitle} tabIndex={-1}>
                {step === 1 ? 'Qual compra precisa de ajuda?' : 'O que aconteceu com a compra?'}
              </h1>
              <div className={styles.steps} aria-label="Etapas do estorno">
                <span className={styles.stepActive} aria-current={step === 1 ? 'step' : undefined}>
                  01 <b>A compra</b>
                </span>
                <i />
                <span
                  className={step === 2 ? styles.stepActive : ''}
                  aria-current={step === 2 ? 'step' : undefined}
                >
                  02 <b>O que aconteceu</b>
                </span>
                <i />
                <span>
                  03 <b>Acompanhar</b>
                </span>
              </div>
              {step === 1 ? (
                <div key="purchase" className={`${styles.formCard} ${styles.enter}`}>
                  <div
                    className={styles.purchaseList}
                    data-refund-tour={transactionId ? undefined : 'purchase'}
                  >
                    {data.transactions.map((tx) => {
                      const existing = data.cases.find((item) => item.transactionId === tx.id);
                      return (
                        <button
                          key={tx.id}
                          aria-pressed={existing ? undefined : transactionId === tx.id}
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
                  key="details"
                  className={`${styles.formCard} ${styles.enter}`}
                  data-refund-tour="details"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void mutate('create', () =>
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
                    <select
                      disabled={Boolean(pending)}
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                    >
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
                      disabled={Boolean(pending)}
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
                      disabled={Boolean(pending)}
                      onChange={(event) => setConfirmed(event.target.checked)}
                    />
                    <span>O estabelecimento já confirmou o cancelamento.</span>
                  </label>
                  <div className={styles.formFooter}>
                    <button
                      className={styles.primary}
                      disabled={Boolean(pending) || description.trim().length < 10}
                    >
                      {pending === 'create' ? pendingLabels.create : 'Abrir atendimento'}
                      {pending === 'create' ? (
                        <LoaderCircle className={styles.spin} size={17} />
                      ) : (
                        <ArrowUpRight size={17} />
                      )}
                    </button>
                  </div>
                </form>
              )}
            </section>
          ) : active ? (
            <section key={active.id} className={styles.enter}>
              <button
                className={styles.back}
                disabled={Boolean(pending)}
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
                    Acompanhar estorno
                  </h1>
                </div>
                <span
                  role="status"
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
                    <h2 ref={actionTitle} tabIndex={-1} data-refund-tour="tracking">
                      {active.status === 'completed' ? 'Resultado' : 'Próximo passo'}
                    </h2>
                    {active.status === 'waiting_merchant' && (
                      <div className={styles.nextAction}>
                        <p>
                          Peça o cancelamento à loja. Quando ela confirmar, registre a confirmação
                          aqui.
                        </p>
                        <button
                          className={styles.primary}
                          disabled={Boolean(pending)}
                          onClick={() =>
                            void mutate('confirm', () =>
                              supportRequest(`/cases/${active.id}/merchant`, { method: 'POST' }),
                            )
                          }
                        >
                          {pending === 'confirm'
                            ? pendingLabels.confirm
                            : 'A loja confirmou o cancelamento'}
                          {pending === 'confirm' ? (
                            <LoaderCircle className={styles.spin} size={16} />
                          ) : (
                            <ArrowRight size={16} />
                          )}
                        </button>
                      </div>
                    )}
                    {active.status === 'waiting_receipt' && (
                      <div className={styles.uploadBox}>
                        <Upload size={24} />
                        <h3>Anexe o comprovante de cancelamento</h3>
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
                          disabled={Boolean(pending)}
                          onChange={(event) => void upload(event.target.files?.[0])}
                        />
                        {pending === 'upload' && <p>{pendingLabels.upload}</p>}
                      </div>
                    )}
                    {active.status === 'queued' && (
                      <div className={styles.callout}>
                        <Clock3 size={19} />
                        <p>
                          {data.integrations.automation
                            ? 'O comprovante está na fila. O status será atualizado aqui após a triagem.'
                            : 'O comprovante está salvo. A triagem começará quando a integração com o n8n for configurada.'}
                        </p>
                      </div>
                    )}
                    {active.status === 'reviewing' && data.integrations.simulationEnabled && (
                      <div className={styles.simulation}>
                        <p>
                          A triagem terminou. Você pode encerrar o teste sem movimentar saldo real.
                        </p>
                        <button
                          className={styles.secondary}
                          disabled={Boolean(pending)}
                          onClick={() =>
                            void mutate('finish', () =>
                              supportRequest(`/cases/${active.id}/simulate`, { method: 'POST' }),
                            )
                          }
                        >
                          {pending === 'finish' ? pendingLabels.finish : 'Simular conclusão'}
                          {pending === 'finish' ? (
                            <LoaderCircle className={styles.spin} size={16} />
                          ) : (
                            <ArrowRight size={16} />
                          )}
                        </button>
                      </div>
                    )}
                    {active.status === 'reviewing' && !data.integrations.simulationEnabled && (
                      <p className={styles.nextAction}>
                        A triagem foi concluída. Acompanhe as atualizações neste protocolo.
                      </p>
                    )}
                    {active.status === 'completed' && (
                      <div className={styles.success}>
                        <Check size={20} />
                        <p>Estorno de teste concluído. Seu saldo real não foi alterado.</p>
                      </div>
                    )}
                  </div>
                  <details className={styles.report}>
                    <summary>
                      Histórico do atendimento <span>{active.events.length}</span>
                    </summary>
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
                  </details>
                  <details className={styles.report}>
                    <summary>Relato e comprovantes</summary>
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
                  </details>
                </div>
                <aside className={styles.detailAside}>
                  <div className={styles.helperCard}>
                    <h2>Precisa de ajuda?</h2>
                    <p>O Flashinho pode explicar a etapa atual do seu estorno.</p>
                    <button
                      className={styles.secondary}
                      onClick={() => setOpenChatRequest((value) => value + 1)}
                    >
                      Perguntar ao Flashinho <ArrowUpRight size={15} />
                    </button>
                  </div>
                  <a
                    className={styles.guideLink}
                    href={data.guide.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Guia de estornos da Flash <ArrowUpRight size={14} />
                  </a>
                </aside>
              </div>
            </section>
          ) : (
            <div key="dashboard" className={styles.enter}>
              <section className={styles.hero}>
                <div>
                  <h1 ref={detailTitle} tabIndex={-1}>
                    Central de atendimento
                  </h1>
                  <p>
                    Abra um atendimento de estorno e acompanhe cada atualização do seu protocolo.
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
                  </div>
                </div>
              </section>
              <section className={styles.casesSection}>
                <div className={styles.sectionTitle}>
                  <h2>Seus atendimentos</h2>
                </div>
                {data.cases.length === 0 ? (
                  <div className={styles.empty}>
                    <span>
                      <FileText size={26} />
                    </span>
                    <div>
                      <h3>Nenhum atendimento aberto</h3>
                      <p>Seus protocolos vão aparecer aqui assim que você abrir um atendimento.</p>
                    </div>
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
                <p>Compras e atendimentos fictícios. Use apenas comprovantes de teste.</p>
              </div>
            </div>
          )}
          <span className={styles.srOnly} role="status">
            {pending ? pendingLabels[pending] : ''}
          </span>
          <footer className={styles.footer}>
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
