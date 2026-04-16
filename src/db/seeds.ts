import type {
  DailyEntry,
  DeviationType,
  EntryDeviation,
  Leader,
  Location,
  OperationStandard,
  User,
} from '@/types';
import { generateTempPin, hashPin } from '@/lib/pin';
import { slugify } from '@/lib/slug';
import { getDeviceId, uuid } from '@/lib/uuid';
import { db } from './database';
import { weekLabel } from '@/lib/time';
import { computeEntry } from '@/lib/calculations';

const NOMES_LIDERES = [
  'DEIVID RODRIGUES DOS SANTOS',
  'DIONES FERNANDO FERNANDES DE SOUZA',
  'DIONLENO PANI BOONE',
  'EZEQUIEL ROEDER DOS SANTOS',
  'FLAVIO BRAULIO DA ROCHA',
  'GEAN SANT ANA RAMOS',
  'GUSTAVO SIMOES MIRANDA',
  'JOSE JOAQUIM DE JESUS SANTANA',
  'MARCOS PAULO FERREIRA',
  'OSVALDO DE SOUZA PINTO',
  'PABLO SANT ANA FELIX',
  'RENATO TERRA',
  'SEVERINO VANILDO DE SOUSA',
];

const TIPOS_DESVIO: Array<{ codigo: string; nome: string }> = [
  { codigo: 'A', nome: 'Interferência Prevista' },
  { codigo: 'B', nome: 'Bloqueio Interditado Não Previsto' },
  { codigo: 'C', nome: 'Bloqueio Interditado Previsto' },
  { codigo: 'D', nome: 'Interperes' },
  { codigo: 'E', nome: 'Passagem de Nível' },
  { codigo: 'F', nome: 'Restrições Operacionais' },
  { codigo: 'G', nome: 'Abertura de PTS' },
  { codigo: 'H', nome: 'DSS Canteiro' },
  { codigo: 'I', nome: 'Boa Jornada' },
  { codigo: 'J', nome: 'Defeito Compressor' },
  { codigo: 'K', nome: 'Revisão de OM' },
  { codigo: 'L', nome: 'Bloqueio' },
  { codigo: 'M', nome: 'Defeito Jato' },
  { codigo: 'N', nome: 'Problema de Transporte' },
  { codigo: 'O', nome: 'Interdição de via' },
  { codigo: 'P', nome: 'Falta de combustível' },
  { codigo: 'Q', nome: 'Defeito PTA' },
  { codigo: 'R', nome: 'Defeito nos bicos de jato' },
  { codigo: 'S', nome: 'Defeito nas mangueiras' },
  { codigo: 'T', nome: 'Atraso andaime' },
  { codigo: 'U', nome: 'Evacuação da área' },
  { codigo: 'V', nome: 'Simulação de Evacuação' },
  { codigo: 'W', nome: 'Interferência Não Prevista' },
  { codigo: 'X', nome: 'Atraso no distensionamento' },
  { codigo: 'Y', nome: 'Problemas de Doc. SSMA' },
  { codigo: 'Z', nome: 'PIT STOP' },
  { codigo: 'AA', nome: 'Abastecimento' },
  { codigo: 'AB', nome: 'Inspeção SSMA' },
  { codigo: 'AC', nome: 'Retorno Almoço' },
  { codigo: 'AD', nome: 'Iluminação' },
];

const LOCAIS: Array<Pick<Location, 'nome' | 'codigo' | 'tipo_operacao'>> = [
  { nome: 'TMFE - H30', codigo: 'TMFE_H30', tipo_operacao: 'MFE' },
  { nome: 'TMFE - H40', codigo: 'TMFE_H40', tipo_operacao: 'MFE' },
  { nome: 'TPM - Pátio', codigo: 'TPM_PATIO', tipo_operacao: 'TPM' },
  { nome: 'CBSI / VALE', codigo: 'CBSI_VALE', tipo_operacao: 'VALE' },
];

const PADROES: Array<
  Pick<
    OperationStandard,
    | 'nome'
    | 'turno'
    | 'dss_canteiro'
    | 'chegada_frente_trabalho'
    | 'abertura_pts'
    | 'inicio_atividade'
    | 'almoco_janta_ida'
    | 'reinicio_atividade'
    | 'termino_atividade'
    | 'carga_horaria_padrao'
  >
> = [
  {
    nome: 'Padrão MFE (Dia)',
    turno: 'Dia',
    dss_canteiro: '07:40',
    chegada_frente_trabalho: '08:00',
    abertura_pts: '08:20',
    inicio_atividade: '08:30',
    almoco_janta_ida: '11:00',
    reinicio_atividade: '12:15',
    termino_atividade: '16:15',
    carga_horaria_padrao: '06:40',
  },
  {
    nome: 'Padrão MFE (Noite)',
    turno: 'Noite',
    dss_canteiro: '19:40',
    chegada_frente_trabalho: '20:00',
    abertura_pts: '20:20',
    inicio_atividade: '20:30',
    almoco_janta_ida: '23:00',
    reinicio_atividade: '00:15',
    termino_atividade: '04:15',
    carga_horaria_padrao: '06:40',
  },
  {
    nome: 'Padrão CBSI / VALE / TPM (Dia)',
    turno: 'Dia',
    dss_canteiro: '07:40',
    chegada_frente_trabalho: '08:20',
    abertura_pts: '08:40',
    inicio_atividade: '09:00',
    almoco_janta_ida: '11:00',
    reinicio_atividade: '12:15',
    termino_atividade: '16:00',
    carga_horaria_padrao: '06:20',
  },
  {
    nome: 'Padrão CBSI / VALE / TPM (Noite)',
    turno: 'Noite',
    dss_canteiro: '19:40',
    chegada_frente_trabalho: '20:20',
    abertura_pts: '20:40',
    inicio_atividade: '21:00',
    almoco_janta_ida: '23:00',
    reinicio_atividade: '00:15',
    termino_atividade: '04:00',
    carga_horaria_padrao: '06:20',
  },
];

/** Idempotente. Roda sempre no bootstrap do app. */
export async function ensureSeeds(): Promise<void> {
  const usersCount = await db.users.count();
  if (usersCount === 0) {
    await seedUsersAndLeaders();
  }
  if ((await db.deviation_types.count()) === 0) {
    await seedDeviationTypes();
  }
  if ((await db.locations.count()) === 0) {
    await seedLocations();
  }
  if ((await db.operation_standards.count()) === 0) {
    await seedStandards();
  }
  const flagSeed = await db.app_settings.where('chave').equals('demo_seeded').first();
  if (!flagSeed) {
    await seedDemoEntries();
    await db.app_settings.add({
      chave: 'demo_seeded',
      valor: 'true',
      created_at: now(),
      updated_at: now(),
    });
  }
}

async function seedUsersAndLeaders() {
  const nowIso = now();

  // Gera PINs temporários INDIVIDUAIS (aleatórios de 4 dígitos) para cada usuário.
  // Não existe mais "PIN padrão compartilhado" — cada líder recebe o seu.
  // Todos os PINs são mostrados uma única vez em "Administração → Líderes → PINs iniciais",
  // e o admin enxerga o seu próprio na tela de login (banner "primeira configuração")
  // até trocá-lo.
  const distribution: {
    admin: { user_id: string; nome: string; pin: string };
    leaders: Array<{ user_id: string; slug: string; nome: string; pin: string }>;
    generated_at: string;
  } = {
    admin: { user_id: '', nome: 'Administrador', pin: '' },
    leaders: [],
    generated_at: nowIso,
  };

  const adminPin = generateTempPin();
  const adminUser: User = {
    id: uuid(),
    nome: 'Administrador',
    slug: 'admin',
    perfil: 'admin',
    pin_hash: await hashPin(adminPin, 'admin'),
    pin_temporario: true,
    ativo: true,
    created_at: nowIso,
    updated_at: nowIso,
  };
  await db.users.add(adminUser);
  distribution.admin = { user_id: adminUser.id, nome: adminUser.nome, pin: adminPin };

  const leadersBatch: Array<{ user: User; leader: Leader; pin: string }> = [];
  for (const nome of NOMES_LIDERES) {
    const slug = slugify(nome);
    const pin = generateTempPin();
    const user: User = {
      id: uuid(),
      nome,
      slug,
      perfil: 'leader',
      pin_hash: await hashPin(pin, slug),
      pin_temporario: true,
      ativo: true,
      created_at: nowIso,
      updated_at: nowIso,
    };
    const leader: Leader = {
      id: uuid(),
      user_id: user.id,
      nome_exibicao: nome,
      equipe: 'Operacional',
      ativo: true,
      created_at: nowIso,
      updated_at: nowIso,
    };
    leadersBatch.push({ user, leader, pin });
  }
  await db.transaction('rw', db.users, db.leaders, async () => {
    for (const { user, leader } of leadersBatch) {
      await db.users.add(user);
      await db.leaders.add(leader);
    }
  });
  distribution.leaders = leadersBatch.map(({ user, pin }) => ({
    user_id: user.id,
    slug: user.slug,
    nome: user.nome,
    pin,
  }));

  await db.app_settings.add({
    chave: 'initial_pins_bootstrap',
    valor: JSON.stringify(distribution),
    created_at: nowIso,
    updated_at: nowIso,
  });
}

async function seedDeviationTypes() {
  const nowIso = now();
  const rows: DeviationType[] = TIPOS_DESVIO.map(t => ({
    id: uuid(),
    codigo: t.codigo,
    nome: t.nome,
    descricao: '',
    ativo: true,
    created_at: nowIso,
    updated_at: nowIso,
  }));
  await db.deviation_types.bulkAdd(rows);
}

async function seedLocations() {
  const nowIso = now();
  const rows: Location[] = LOCAIS.map(l => ({
    id: uuid(),
    nome: l.nome,
    codigo: l.codigo,
    tipo_operacao: l.tipo_operacao,
    ativo: true,
    created_at: nowIso,
    updated_at: nowIso,
  }));
  await db.locations.bulkAdd(rows);
}

async function seedStandards() {
  const nowIso = now();
  const rows: OperationStandard[] = PADROES.map(p => ({
    id: uuid(),
    nome: p.nome,
    local_id: null,
    turno: p.turno,
    dss_canteiro: p.dss_canteiro,
    chegada_frente_trabalho: p.chegada_frente_trabalho,
    abertura_pts: p.abertura_pts,
    inicio_atividade: p.inicio_atividade,
    almoco_janta_ida: p.almoco_janta_ida,
    reinicio_atividade: p.reinicio_atividade,
    termino_atividade: p.termino_atividade,
    carga_horaria_padrao: p.carga_horaria_padrao,
    ativo: true,
    created_at: nowIso,
    updated_at: nowIso,
  }));
  await db.operation_standards.bulkAdd(rows);
}

async function seedDemoEntries() {
  // Cria alguns lançamentos em alguns líderes para o dashboard não ficar vazio.
  const device = getDeviceId();
  const locais = await db.locations.toArray();
  const devTypes = await db.deviation_types.toArray();
  const leaders = await db.leaders.limit(5).toArray();
  if (leaders.length === 0) return;

  const today = new Date();
  const entries: DailyEntry[] = [];
  const devs: EntryDeviation[] = [];

  for (let i = 0; i < leaders.length; i++) {
    const leader = leaders[i];
    const local = locais[i % locais.length];
    for (let d = 0; d < 4; d++) {
      const date = new Date(today);
      date.setDate(today.getDate() - d);
      const iso = date.toISOString().slice(0, 10);
      const base = {
        inicio_atividade: '08:30',
        almoco_janta_ida: '11:00',
        reinicio_atividade: '12:15',
        termino_atividade: '16:15',
      } as const;
      const rawDeviations = [
        { horas: d === 0 ? '01:00' : '00:30', typeIdx: 0 },
        { horas: d === 1 ? '02:00' : '00:20', typeIdx: 1 },
      ];
      const entryId = uuid();
      const computed = computeEntry(base, rawDeviations);
      const entry: DailyEntry = {
        id: entryId,
        leader_id: leader.id,
        owner_user_id: leader.user_id,
        data: iso,
        semana: weekLabel(iso),
        turno: 'Dia',
        local_id: local?.id ?? null,
        efetivo: 5 + i,
        dss_canteiro: '07:40',
        chegada_frente_trabalho: '08:00',
        abertura_pts: '08:20',
        ...base,
        carga_horaria_trabalhada: computed.carga_horaria_trabalhada,
        desvio_total: computed.desvio_total,
        percentual_produtivo: computed.percentual_produtivo,
        percentual_improdutivo: computed.percentual_improdutivo,
        observacoes: 'Registro de demonstração (seed).',
        sync_status: 'local_only',
        version: 1,
        device_id: device,
        created_at: now(),
        updated_at: now(),
      };
      entries.push(entry);

      rawDeviations.forEach((r, idx) => {
        devs.push({
          id: uuid(),
          daily_entry_id: entryId,
          sequencia: idx + 1,
          horas: r.horas,
          deviation_type_id: devTypes[r.typeIdx]?.id ?? null,
          observacao: '',
          sync_status: 'local_only',
          version: 1,
          device_id: device,
          created_at: now(),
          updated_at: now(),
        });
      });
    }
  }

  await db.daily_entries.bulkAdd(entries);
  await db.entry_deviations.bulkAdd(devs);
}

function now(): string {
  return new Date().toISOString();
}
