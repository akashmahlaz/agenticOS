# agenticOS — Lead Gen & Client Acquisition Strategy

## What You Have Now

Two new sub-agents, fully integrated:

### 🎯 Lead Gen (`delegateToLeadGen`)
Finds professional contacts via RocketReach.
- **Setup**: Add `ROCKETREACH_API_KEY` secret at `/secrets`
- **Capabilities**:
  - `searchContacts(query)` — search by role + industry + location
  - `lookupContact(email|linkedin|name)` — get full details
  - `enrichContact(partial profile)` — fill in missing data

### 💻 Developer (`delegateToDeveloper`)
Works on code via GitHub.
- **Setup**: Add `GITHUB_TOKEN` secret at `/secrets` (fine-grained PAT with `repo` scope)
- **Capabilities**:
  - `listRepos()`, `getRepo(owner, repo)`, `listFiles(owner, repo)`, `getFile(...)`
  - `searchCode(query)` — search across all your repos
  - `listIssues`, `createIssue` — manage issues

### 🔄 Agentic Loop
The agent now keeps working until the task is done:
- Up to 20 reasoning steps per turn
- Signals completion with `<!-- TASK_COMPLETE -->`
- Retries on failure with adjusted parameters
- Multiple parallel searches when needed

---

## Use Cases for Finding New Clients

### 1. **Build Targeted Lead Lists**
```
Find 25 CTOs at SaaS startups in Germany with 50-200 employees.
For each, get name, title, company, email (if available), and LinkedIn.
Save the list to my knowledge base.
```
The agent will:
- Run multiple parallel searches ("CTO SaaS Germany", "VP Engineering SaaS Berlin", etc.)
- Score and dedupe
- Save to `/knowledge` for future RAG

### 2. **Enrich Inbound Leads**
```
Here's a name: Sarah Lee, she said she's VP Sales at Stripe.
Get her full contact info and find 10 similar profiles (VP Sales at fintechs).
```

### 3. **Account-Based Marketing (ABM)**
```
I'm targeting these 5 companies: [list]. For each, find the
CMO, CTO, and Head of Sales. Get their emails and LinkedIn.
```
Then draft personalized outreach based on the company context.

### 4. **Competitive Intelligence**
```
Find me 20 Heads of Growth at companies similar to mine
(I sell B2B SaaS for project management). Look at competitors
like Asana, Monday, ClickUp, and adjacent products.
```

### 5. **Code-Driven Lead Magnet**
```
In my agenticOS repo, find the file that handles auth and tell me
if there are any obvious improvements I could ship this week.
Then create a GitHub issue with the suggestions.
```
(uses Developer sub-agent for code work)

---

## Workflow: From Query to Outreach

The agent can drive the full funnel:

```
┌─────────────┐   ┌──────────┐   ┌─────────────┐   ┌──────────┐
│ 1. Research │ → │ 2. Find  │ → │ 3. Enrich   │ → │ 4. Save  │
│  ICP & list │   │  contacts│   │  full data  │   │  to KB   │
└─────────────┘   └──────────┘   └─────────────┘   └──────────┘
   Researcher       Lead Gen       Lead Gen         Knowledge
```

You can ask the agent to chain these:
```
Build me a list of 20 marketing directors at healthcare
SaaS startups in the US. Save to knowledge. Then suggest
3 subject lines for cold outreach emails.
```

---

## Setting Up the API Keys

1. **RocketReach**: https://rocketreach.co/api
   - Sign in → Settings → API → Copy your key
   - Add at `/secrets` with name `ROCKETREACH_API_KEY`

2. **GitHub**: https://github.com/settings/personal-access-tokens/new
   - Fine-grained token, expiry 90 days
   - Repository access: "All repositories" (or specific ones)
   - Permissions: Contents (read), Issues (read+write), Metadata (read)
   - Add at `/secrets` with name `GITHUB_TOKEN`

Or just say in chat:
> "Save this secret: ROCKETREACH_API_KEY = <your_key>"
> "Save this secret: GITHUB_TOKEN = <your_token>"

The agent will encrypt and store them.

---

## What's Next

After the keys are added, the system can:

1. **Auto-discover prospects** matching your ICP
2. **Enrich** any partial contact you find
3. **Save** lists to your knowledge base (RAG-searchable)
4. **Draft** personalized outreach based on contact + company
5. **Iterate** on results: "those are too senior", "try NYC instead", etc.

For sales, the loop becomes:
- Define ICP once → save to USER.md as durable directive
- Ask "give me 20 leads matching my ICP" any time
- Agent remembers the criteria, refines, persists results
