# nodra-plugin-registry (template)

Modèle pour le **registre de plugins Nodra**, calqué sur `simplyterm-plugin-registry`.
À héberger dans un repo séparé publié sur GitHub Pages. L'app Nodra lit
`plugins.json` (Réglages → Plugins).

## Fichiers

- **`repos.json`** — source de vérité : la liste des repos de plugins *approuvés* et les
  capacités (permissions) qui leur sont autorisées. Modifié uniquement par PR + revue humaine.
- **`plugins.json`** — index *généré* (par l'Action) : métadonnées + `download_url` + `sha256`
  de chaque release. C'est ce que l'app télécharge. Ne pas éditer à la main.
- **`.github/workflows/update-registry.yml`** — l'Action : pour chaque repo de `repos.json`,
  récupère la dernière release, vérifie que les permissions ⊆ `approved_permissions`, calcule
  le SHA-256 du `plugin.zip`, et ouvre une PR mettant `plugins.json` à jour.

## Publier un plugin (auteur)

1. Crée un repo avec `manifest.json` (voir le format ci-dessous) + `index.js` *self-contained*.
2. Package : `node scripts/package-plugin.mjs <dossier>` → produit `plugin.zip` + son `sha256`.
3. Attache `plugin.zip` à une **GitHub Release**.
4. Ouvre une PR ajoutant ton repo à `repos.json` avec ses `approved_permissions`.

Le mainteneur relit le code + les permissions, merge ; l'Action détecte la release et propose
la mise à jour de `plugins.json`. **Aucun code de plugin n'atteint les utilisateurs sans revue.**

## Format `manifest.json`

```json
{
  "id": "com.author.my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "api_version": "1.0.0",
  "description": "…",
  "author": "…",
  "permissions": ["blocks"],
  "main": "index.js",
  "category": "blocks",
  "keywords": ["…"]
}
```

`id` reverse-domain · `version`/`api_version` semver · `permissions` ⊆ `blocks`, `node-types`,
`importers`, `exporters`, `panels`, `commands`, `flow-read`, `flow-write`. `main` exporte
`register(host)` et doit être **self-contained** (données inlinées, pas d'import relatif runtime).

## CI

L'Action `update-registry.yml` ouvre une PR via `peter-evans/create-pull-request`. Active
**Settings → Actions → General → « Allow GitHub Actions to create and approve pull requests »**
(off par défaut), sinon l'étape échoue. Alternative : passer un PAT via
`token: ${{ secrets.REGISTRY_PAT }}`.
