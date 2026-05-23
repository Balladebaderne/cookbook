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
- [ ] Rollback-plan er dokumenteret.
- [x] Feature branch er bevaret for sporbarhed.

---

## 3. Kodekvalitet
- [x] ESLint passerer (kører grønt i CI).
- [x] Ingen secrets i repo.
- [x] Konventionelle commits bruges.
- [x] Koden er læsbar og organiseret.

---

## 4. Tests
- [x] Unit tests dækker kritisk logik.
- [x] Integrationstests for API endpoints.
- [ ] Coverage er over 70%.
- [x] Tests kører automatisk i CI.

---

## 5. CI/CD
- [x] Build, lint og tests kører automatisk.
- [x] `npm audit` passerer uden high severity findings.
- [x] Automatisk deployment til Azure VMs.
- [x] Blue/green deployment er understøttet.
- [ ] Health checks kører før deploy.

---

## 6. Infrastruktur & Drift
- [x] Systemet kører på Azure VMs.
- [ ] Netværk og firewall er korrekt konfigureret.
- [ ] Monitoring er aktivt: logs, metrics og alerts.
- [x] Health endpoint `/health` fungerer.
- [x] Systemet er live og tilgængeligt.

---

## 7. Projektdokumentation
- [x] README er opdateret med setup, run og deploy.
- [ ] Arkitekturdiagrammer er inkluderet.
- [ ] Database migration er dokumenteret.
- [x] CI/CD pipeline er dokumenteret.
