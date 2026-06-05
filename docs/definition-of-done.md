# Definition of Done

Cookbook-projektet er *Done*, når alle relevante krav er opfyldt.

---

## 1. Funktionalitet
- [x] Funktionalitet er implementeret og matcher API-kontrakten i `openapi.yaml`.
- [x] Ingen breaking changes: eksisterende endpoints fungerer fortsat.
- [x] Backend kører på Node.js `node:http` uden frameworks.

---

## 2. Database & Migration
- [x] Bruger PostgreSQL i både udvikling og produktion.
- [x] Migration er gennemført uden datatab.
- [x] Rollback-plan er dokumenteret (`deploy/README-blue-green.md`).
- [x] Feature branch er bevaret for sporbarhed.

---

## 3. Kodekvalitet
- [x] ESLint passerer (kører grønt i CI).
- [x] Ingen secrets i repo.
- [x] Konventionelle commits bruges.
- [x] Koden er læsbar og organiseret.
- [ ] Statisk kodeanalyse med SonarQube Cloud kører på pushes og pull requests, og Quality Gate dekorerer PR'er. _(Workflow + config på plads i `.github/workflows/sonarqube.yml` og `sonar-project.properties`; afventer oprettelse af SonarCloud-projekt + `SONAR_TOKEN`-secret.)_

---

## 4. Tests
- [x] Unit tests dækker kritisk logik.
- [x] Integrationstests for API endpoints.
- [x] Coverage er over 70% (~84% line coverage; `npm run test:coverage`).
- [x] Tests kører automatisk i CI.

---

## 5. CI/CD
- [x] Build, lint og tests kører automatisk.
- [x] `npm audit` passerer uden high severity findings.
- [x] Automatisk deployment til Azure VMs.
- [x] Blue/green deployment er understøttet.
- [x] Health checks kører før deploy (blue/green sundhedstjek før nginx skifter farve).

---

## 6. Infrastruktur & Drift
- [x] Systemet kører på Azure VMs.
- [ ] Netværk og firewall er korrekt konfigureret.
- [x] Monitoring er aktivt: logs, metrics og alerts. _(Prometheus/Grafana-stakken deployes til nginx-VM'en som en del af nginx-deploy-jobbet i CI/CD; Grafana er nået via `/grafana`, backend scrapes via privat IP for blue+green. Beslutning om dedikeret monitoring-VM (#108, 12.6) afventer gruppe. **Alerting (#132):** Prometheus alert-regler → Alertmanager → Discord-besked + auto-oprettet GitHub-issue; Phase 1 (regler + Alertmanager + github-receiver) bygget og **end-to-end-testet lokalt** (Discord-levering + GitHub-issue-oprettelse + auto-close ved resolve alle verificeret), Phase 2 (CI-wiring + `DISCORD_WEBHOOK_URL`/`GH_ISSUE_TOKEN`-secrets) afventer gruppe-sign-off.)_
- [x] Health endpoint `/health` fungerer.
- [x] Systemet er live og tilgængeligt. _(Fast offentlig IP `4.211.254.152` (Standard, statisk) i den delte team-subscription; `create_three_vms.sh` og `azure-teardown.sh` pinner subscriptionen, så IP'en overlever teardown/re-provision og ikke kan ende i en personlig subscription.)_

---

## 7. Projektdokumentation
- [x] README er opdateret med setup, run og deploy.
- [x] Arkitekturdiagrammer er inkluderet (ASCII-topologidiagram i `README.md`).
- [x] Database migration er dokumenteret (`docs/exam_features.md`).
- [x] CI/CD pipeline er dokumenteret.
