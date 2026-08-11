# SupraBom

Projeto de estudo de **comunicação em tempo real** com [Socket.IO](https://socket.io/), [React](https://react.dev/) e [Tailwind CSS](https://tailwindcss.com/).

Salas com **código**, escolha de **sprite**, **nome** e **poder**, mapa aleatório estilo Bomberman, **1 vida**, upgrades raros de alcance/bombas e vitória do **último vivo**.

## Demo online

**Jogar:** [https://supraboom.onrender.com/](https://supraboom.onrender.com/)

Hospedado no [Render](https://render.com) (plano free). O serviço **hiberna após ~15 minutos sem tráfego**; na primeira visita (ou depois de idle) o site pode levar **cerca de 30–60 segundos** para “acordar” e carregar. Se a página ficar em branco ou demorar, aguarde e atualize.

---

## Como rodar

```bash
npm install
npm run dev
```

- Cliente (Vite): [http://localhost:5173](http://localhost:5173)
- Servidor Socket.IO: `http://localhost:3000`
- Na mesma rede (celular/outro PC): `http://SEU_IP:5173` (Vite já escuta em `0.0.0.0`; o servidor libera origins de LAN)

Config local em [`.env`](.env) (veja [`.env.example`](.env.example)).

### Supabase (login + dados)

1. Em **Project Settings → API**, copie `anon` e `service_role` para o `.env` (`VITE_SUPABASE_ANON_KEY` / `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY`).
2. Rode o SQL em [`supabase/schema.sql`](supabase/schema.sql) no **SQL Editor**.
3. Em **Authentication → Providers**, deixe Email ativo.
4. Em **Authentication → URL Configuration**, use a URL de **network** (não só localhost):
   - **Site URL:** `http://SEU_IP:5173` (ex.: `http://10.26.2.29:5173`)
   - **Redirect URLs:** `http://SEU_IP:5173/**` e `http://localhost:5173/**`
5. No `.env`, defina `VITE_APP_URL=http://SEU_IP:5173` (mesmo host da Site URL).
6. Reinicie `npm run dev`.

Sem as keys no `.env`, a tela de login avisa e o jogo não autentica.

Abra o cliente em várias abas (ou dispositivos na mesma rede apontando para o host).

1. **Criar sala** (recebe um código) ou **entrar** digitando o código
2. Escolher **sprite**, **nome** e **1 poder**
3. No lobby, cada jogador clica em **Pronto** (o **host** pode expulsar outros)
4. Com **pelo menos 2** jogadores e todos prontos, começa a contagem **3 · 2 · 1 · GO!**
5. Cada vitória soma no **placar da sala**; após o fim, o lobby volta em ~5s

Máximo de **4** jogadores por sala. O jogo ocupa cerca de **90%** da tela.

### Produção

Demo: [https://supraboom.onrender.com/](https://supraboom.onrender.com/) (cold start no free tier — pode demorar na primeira carga).

Local / servidor próprio:

```bash
npm run build
npm start
```

Sobe o Express + Socket.IO na porta **3000** (ou `PORT`) servindo o build do React.

---

## Controles

| Tecla        | Ação            |
| ------------ | --------------- |
| Setas / WASD | Move por tile   |
| Espaço       | Solta bomba     |
| E (padrão)   | Usa o poder     |

A tecla do poder vem de `activationKey` / `activationKeyLabel` em [`config/abilities.json`](config/abilities.json).

---

## Poderes

Cada jogador escolhe **um** poder na entrada. Cooldowns, alcance, velocidade e durações ficam só no JSON:

| Id | Nome | Efeito |
| -- | ---- | ------ |
| `ice_ray` | Raio de gelo | Projétil que deixa o inimigo mais lento |
| `local_blast` | Explosão localizada | Quebra softs no raio; empurra ou dá stun |
| `confusion` | Confusão | Projétil que inverte as teclas do alvo |
| `miner` | Minerador | Quebra o soft imediatamente à frente |

Edite [`config/abilities.json`](config/abilities.json) e reinicie o servidor para aplicar.

---

## Regras

- Blocos **cinza** = indestrutíveis · blocos **marrom** = quebráveis
- Soft quebrado pode dropar **Fire** (~12%, +alcance) ou **Bomb** (~10%, +1 bomba simultânea)
- Explosão mata de vez · último vivo ganha
- Sprite escolhido na entrada (não pode repetir na mesma sala)

---

## Scripts

| Comando         | Descrição                                      |
| --------------- | ---------------------------------------------- |
| `npm install`   | Instala dependências                           |
| `npm run dev`   | Servidor + Vite (hot reload)                   |
| `npm run build` | Build do React para `dist/`                    |
| `npm start`     | Sobe o servidor servindo o build               |

---

## Estrutura

```
config/abilities.json  # configs dos poderes (cooldown, alcance, tecla…)
server/index.cjs       # Express + Socket.IO (salas + jogo)
server/abilities.cjs   # lógica dos poderes
src/                   # React + Tailwind
public/assets/         # Sprites, bomb.png, grass.png
```

---

## Licença

Projeto criado para fins de estudo. Sprites Last Guardian: CC BY-NC 2.5 (Philipp Lenssen).
