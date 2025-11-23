# GitHub Cache Purge Instructions

## ⚠️ IMPORTANTE: Commits Antiguos en Caché de GitHub

Aunque hemos limpiado completamente el historial local y hecho force push, **GitHub mantiene commits antiguos en caché por aproximadamente 90 días** para prevenir pérdida accidental de datos.

El commit `71a9d819f6e3224096db2976257fd81405e185b6` todavía es accesible via URL directa en GitHub, aunque ya no existe en el árbol de commits del repositorio.

---

## 📋 Pasos para Purgar Completamente de GitHub

### Opción 1: Contactar GitHub Support (Recomendado)

1. **Ir a GitHub Support**
   - URL: https://support.github.com/contact/private-information
   - O desde el repo: Settings → Support → Contact Support

2. **Seleccionar categoría**
   - Category: "Sensitive data removal"
   - O "Security"

3. **Completar el formulario**

   **Subject:** Request to purge sensitive commit from repository cache

   **Message:**
   ```
   Hello GitHub Support,

   I have rewritten the git history of my repository to remove sensitive credentials
   that were accidentally committed. However, the old commit is still accessible via
   direct URL even though it no longer exists in the repository's commit tree.

   Repository: poap-studio/xbot
   Commit to purge: 71a9d819f6e3224096db2976257fd81405e185b6
   Commit URL: https://github.com/poap-studio/xbot/commit/71a9d819f6e3224096db2976257fd81405e185b6

   This commit contains sensitive environment variables including:
   - Database credentials (passwords and connection strings)
   - API keys (POAP API, Twitter API)
   - Authentication secrets (NextAuth, Cron, Encryption)
   - OAuth tokens (Vercel OIDC)

   Actions already taken:
   - ✅ Rewritten entire git history using git-filter-repo
   - ✅ Force pushed cleaned history to main branch
   - ✅ Verified commit no longer exists in local repository
   - ✅ All exposed credentials have been rotated

   Could you please purge this commit completely from GitHub's cache so it's no
   longer accessible via the direct URL?

   Thank you for your assistance.
   ```

4. **Enviar y esperar respuesta**
   - GitHub suele responder en 24-48 horas
   - Te confirmarán cuando el commit haya sido purgado

---

### Opción 2: Usando GitHub CLI (Si está disponible)

**Nota**: Esta opción puede no estar disponible públicamente. GitHub Support es más confiable.

```bash
# Verificar si el comando existe
gh api repos/poap-studio/xbot/commits/71a9d819 2>&1 | grep "404"

# Si devuelve 404, el commit ya no es accesible vía API
# (pero puede seguir en cache web)
```

---

### Opción 3: Hacer el Repositorio Privado Temporalmente

Si necesitas urgencia mientras esperas a GitHub Support:

1. Ir a: https://github.com/poap-studio/xbot/settings
2. Scroll hasta "Danger Zone"
3. Hacer el repo privado temporalmente
4. Esto limitará el acceso al commit mientras GitHub lo purga

**⚠️ IMPORTANTE**: Esto afectará a colaboradores y deployment en Vercel.

---

## ✅ Verificación

Después de que GitHub confirme la purga, verifica que el commit ya no sea accesible:

```bash
# Debe dar error 404
curl -I https://github.com/poap-studio/xbot/commit/71a9d819f6e3224096db2976257fd81405e185b6
```

---

## 🔒 Recordatorio: Rotación de Credenciales

**TODAS las credenciales expuestas DEBEN ser rotadas**, incluyendo:

- ✅ Database password (AWS RDS)
- ✅ POAP API keys (Client ID, Secret, API Key)
- ✅ Twitter API keys (API Key, Secret, Bearer Token, OAuth Client)
- ✅ Application secrets (CRON_SECRET, ENCRYPTION_SECRET, NEXTAUTH_SECRET)
- ✅ Vercel environment variables

Actualizar en: https://vercel.com/poap-studio/xbot/settings/environment-variables

---

**Creado**: 2025-11-23
**Repositorio**: poap-studio/xbot
