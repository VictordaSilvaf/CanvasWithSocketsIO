# SupraBom

Projeto de estudo de **comunicação em tempo real** com [Socket.IO](https://socket.io/), [React](https://react.dev/) e [Tailwind CSS](https://tailwindcss.com/).

Salas **públicas/privadas** (com nome opcional), listagem de salas públicas, escolha de **sprite** e **nome**, **poder no countdown**, mapa estilo Bomberman, **1 vida**, upgrades raros e vitória do **último vivo**. Após morrer, você **assiste** a partida.

## Demo online

**Jogar:** [https://supraboom.onrender.com/](https://supraboom.onrender.com/)

Hospedado no [Render](https://render.com) (plano free). O serviço **hiberna após ~15 minutos sem tráfego**; na primeira visita (ou depois de idle) o site pode levar **cerca de 30–60 segundos** para “acordar”.

---

## Como rodar

```bash
npm install
npm run dev
```

- Cliente (Vite): [http://localhost:5173](http://localhost:5173)
- Servidor Socket.IO: `http://localhost:3000`
- Na mesma rede (celular/outro PC): `http://SEU_IP:5173`

Config local em [`.env`](.env) (veja [`.env.example`](.env.example)).

### Supabase (login + dados)

1. Em **Project Settings → API**, copie `anon` e `service_role` para o `.env`.
2. Rode o SQL em [`supabase/schema.sql`](supabase/schema.sql).
3. Em **Authentication → Providers**, deixe Email ativo.
4. Configure **Site URL** / **Redirect URLs** e `VITE_APP_URL`.
5. Reinicie `npm run dev`.

Sem as keys, a tela de login avisa. Modo convidado continua disponível.

### Redis (opcional — persistência de salas)

Defina `REDIS_URL` (ex.: Upstash). Com Redis, o servidor salva/restaura salas após restart e o cliente tenta **rejoin** automático. Sem `REDIS_URL`, salas ficam só em memória.

### Fluxo

1. **Criar sala** (pública ou privada, nome opcional) ou **entrar** por código / lista pública
2. Escolher **sprite** e **nome**
3. No lobby, **Pronto** (host pode expulsar; qualquer um pode **Sair da sala**)
4. Com **≥ 2** jogadores prontos: countdown **15s** (ou **3s** se todos escolherem poder) · GO!
5. Poderes são escolhidos **durante o countdown** (sem escolha = aleatório)
6. Vitórias no placar da sala; ranking global em **Ranking** na Home
7. Após o fim, lobby volta em ~5s

Máximo de **4** jogadores por sala.

### Produção

```bash
npm run build
npm start
```

---

## Controles

| Tecla / UI   | Ação            |
| ------------ | --------------- |
| Setas / WASD | Move por tile   |
| Espaço       | Solta bomba     |
| Z (padrão)   | Usa o poder     |
| Mobile       | D-pad + bomba + poder |

Tecla do poder: `activationKey` / `activationKeyLabel` em [`config/abilities.json`](config/abilities.json).

---

## Poderes

Escolha **um** poder no countdown. Configs no JSON:

| Id | Nome | Efeito |
| -- | ---- | ------ |
| `ice_ray` | Raio de gelo | Projétil que deixa o inimigo lento |
| `local_blast` | Explosão localizada | Quebra softs no raio; empurra / stun |
| `confusion` | Confusão | Inverte teclas do alvo |
| `miner` | Minerador | Quebra o soft à frente |
| `ghost` | Fantasma | Atravessa softs por um tempo |
| `remote_bomb` | Bomba remota | Planta bomba à distância |

---

## Regras

- Blocos **cinza** = indestrutíveis · **marrom** = quebráveis · chão branco
- Soft quebrado pode dropar **Fire** ou **Bomb**
- Explosão mata de vez · último vivo ganha · mortos assistem
- Sprite único por sala

---

## Scripts

| Comando         | Descrição                    |
| --------------- | ---------------------------- |
| `npm install`   | Instala dependências         |
| `npm run dev`   | Servidor + Vite              |
| `npm run build` | Build React → `dist/`        |
| `npm start`     | Serve build + Socket.IO      |
| `npm test`      | Testes unitários (vitest)    |

---

## Estrutura

```
config/abilities.json   # poderes
server/index.cjs        # Express + Socket.IO
server/abilities.cjs    # lógica dos poderes
server/roomStore.cjs    # Redis opcional
server/roomHelpers.cjs  # helpers testáveis
src/                    # React + Tailwind
public/assets/          # sprites, bomb.png, power.png
```

---

## Licença

Projeto criado para fins de estudo. Sprites Last Guardian: CC BY-NC 2.5 (Philipp Lenssen).
