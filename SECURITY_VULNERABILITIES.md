# ⚠️ SECURITY VULNERABILITIES - EDUCATIONAL PURPOSE ONLY ⚠️

**WARNING: This application contains intentional security vulnerabilities for educational purposes.**
**DO NOT deploy this application in production or expose it to the internet!**

## Purpose
This application is designed for a DevOps security training class where students will:
1. Identify SQL injection vulnerabilities
2. Understand how they can be exploited
3. Learn how to fix them properly

## SQL Injection Vulnerabilities

### Vulnerability #1: Recipe Detail Page (HTML Route)
**Location:** `app.py` - Line 296
**Endpoint:** `/recipes/<id>/`
**Vulnerable Code:**
```python
cursor.execute('SELECT id, title, time_minutes, price, link, description FROM recipes WHERE id = ' + str(id))
```

**Issue:** Uses string concatenation to insert user input directly into SQL query.

**Exploitation Example:**
Even though Flask route uses `<int:id>`, this pattern demonstrates the vulnerability type.

---

### Vulnerability #2: Recipe API Endpoint
**Location:** `app.py` - Line 457
**Endpoint:** `/api/recipe/recipes/<id>/`
**Vulnerable Code:**
```python
cursor.execute('SELECT id, title, time_minutes, price, link, description FROM recipes WHERE id = ' + str(id))
```

**Issue:** Same as #1, uses string concatenation without parameterization.

---

## How to Fix These Vulnerabilities

### ❌ VULNERABLE (Current Code):
```python
# DO NOT USE - String concatenation
cursor.execute('SELECT * FROM recipes WHERE id = ' + str(id))
```

### ✅ SECURE (Fixed Code):
```python
# USE THIS - Parameterized queries
cursor.execute('SELECT * FROM recipes WHERE id = ?', (id,))
```

## Student Assignment

**Task:** Fix all SQL injection vulnerabilities in this application.

**Steps:**
1. Identify all vulnerable SQL queries (hint: look for string concatenation with `+` in cursor.execute())
2. Replace string concatenation with parameterized queries using `?` placeholders
3. Test your fixes to ensure:
   - Normal functionality still works
   - SQL injection attempts are properly neutralized
4. Document your changes

**Testing Your Fix:**
Try these SQL injection attempts - they should NOT work after your fix:
- Access recipe endpoints with malicious input
- Verify that only legitimate recipe IDs work

---

## Additional Security Considerations

While fixing SQL injection is the primary focus, students should also be aware of:
1. No authentication/authorization implemented
2. No input validation
3. No rate limiting
4. Debug mode enabled in production
5. No HTTPS/TLS encryption
6. No error handling (could expose system information)

---

**Remember:** These vulnerabilities are intentional for learning purposes. Never introduce such vulnerabilities in real applications!
