# **Definition of Done**

 **Cookbook‑projektet** er *Done* når alle krav er opfyldt.

---

## **1. Funktionalitet**
- [x] Funktionalitet implementeret og matcher API‑kontrakten i `openapi.yaml`.  
- [x] Ingen breaking changes — eksisterende endpoints fungerer fortsat.  
- [x] Backend kører på Node.js `node:http` uden frameworks.

---

## **2. Database & Migration**
- [x] Understøtter både SQLite (dev) og PostgreSQL (prod).  
- [x] Migration gennemført uden datatab.  
- [ ] Rollback‑plan dokumenteret.  
- [ ] Feature branch bevaret for sporbarhed.

---

## **3. Kodekvalitet**
- [ ] ESLint og Prettier passerer.  
- [x] Ingen secrets i repo.  
- [x] Konventionelle commits.  
- [x] Kode er læsbar og organiseret.

---

## **4. Tests**
- [x] Unit tests dækker kritisk logik.  
- [x] Integrationstests for API endpoints.  
- [ ] Coverage > 70%.  
- [x] Tests kører automatisk i CI.

---

## **5. CI/CD**
- [x] Build, lint og tests kører automatisk.  
- [x] npm audit uden high severity.  
- [x] Automatisk deployment til Azure VMs.  
- [x] Blue/green deployment understøttet.  
- [ ] Health checks før deploy.

---

## **6. Infrastruktur & Drift**
- [x] Kører på Azure VMs.  
- [ ] Netværk og firewall korrekt konfigureret.  
- [ ] Monitoring aktiv (logs, metrics, alerts).  
- [x] Health endpoint `/health` fungerer.  
- [x] Systemet er live og tilgængeligt.

---

## **7. Projekt‑dokumentation**
- [x] README opdateret med setup, run og deploy.  
- [ ] Arkitekturdiagrammer inkluderet.  
- [ ] Database migration dokumenteret.  
- [x] CI/CD pipeline dokumenteret.

---