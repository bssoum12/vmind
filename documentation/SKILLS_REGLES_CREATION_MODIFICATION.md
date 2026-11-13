# Skills VMIND : règles de création et de modification

Ce document décrit ce qu'est un skill (une « compétence ») dans VMIND, comment il est construit, et toutes les règles appliquées quand on le crée, le modifie ou l'importe. Il sert de référence aux personnes qui écrivent des skills et aux développeurs qui font évoluer le module.

Les règles décrites ici sont **structurelles** : elles lisent le texte, sa forme et les fichiers, sans intelligence artificielle. Une vérification du sens (cohérence, qualité de la description, doublons de fond) viendra dans une étape séparée.

---

## 1. Où vivent les règles

| Élément | Emplacement | Rôle |
|---|---|---|
| Règles bloquantes | `Vmind_Backend/src/services/skillValidator.ts` | Tout problème trouvé ici empêche l'enregistrement. |
| Avertissements et informations | `Vmind_Backend/src/services/skillChecks.ts` | N'empêchent jamais l'enregistrement. |
| Textes de départ de l'éditeur | `Vmind_Backend/src/services/skillStarters.ts` | Seul endroit où ils sont écrits ; envoyés au front avec les limites. |
| Vérification d'un brouillon | `POST /api/skills/check` | Exécute les deux familles de règles sur n'importe quel brouillon, sans rien enregistrer. |
| Limites | `.env` du backend, servies par `GET /api/skills/limits` | Les mêmes chiffres pour l'éditeur et pour la validation. |
| Éditeur | `Vmind_Front/features/skills/SkillEditor.tsx` | Affiche les problèmes ; un clic sur un problème ouvre l'endroit concerné. |

Le front n'a **aucune règle propre** sur le contenu : il affiche ce que renvoie `/check`. Un skill importé est donc vérifié exactement comme un skill écrit dans l'éditeur.

Chaque problème renvoyé contient :
- `code` : identifiant stable (par exemple `ref_uncited`) ;
- `level` : `blocking`, `warning` ou `info` ;
- `field` : la partie concernée (`description`, `body_md`, `references`…) ;
- `title`, `why`, `fix` : le problème, pourquoi il compte, comment le corriger, en mots simples ;
- `term` : le fichier, le titre ou le mot concerné, pour pouvoir masquer un avertissement pour ce cas seulement ;
- `path` : le fichier de référence à ouvrir au clic, quand il diffère de `term`.

---

## 2. Anatomie d'un skill

| Partie | Description |
|---|---|
| **Nom court** (`title`) | Ce que l'utilisateur voit dans sa liste. |
| **Identifiant** (`slug`) | Ce qu'on tape après `/` dans le chat. Lettres minuscules, chiffres et tirets. |
| **Description** | La phrase que l'assistant lit pour décider d'utiliser le skill : « Quand on demande … Pas pour … ». |
| **Instructions** (`body_md`) | Ce que l'assistant doit faire, en Markdown. |
| **Type** (`kind`) | `style` (présentation des réponses) ou `method` (méthode métier). Les utilisateurs non administrateurs créent des skills `style`. |
| **Portée** (`scope`) | `USER` (personnel), `TENANT` (organisation), `ERP` (clients d'un ERP), `GLOBAL` (tous). |
| **ERP** (`erp_types`) | Les ERP auxquels le skill s'applique. Une liste vide = tous les ERP. |
| **Fichiers de référence** (`references_json`) | Fichiers `.md` joints : documents ou sous-skills. |

Un skill **ne contient pas de liste d'outils**. Les outils d'un ERP sont cités dans le texte quand c'est utile ; la liste des outils appartient au connecteur, pas au skill.

### Fichiers de référence

- **Document** : tout fichier `.md` qui n'est pas un `SKILL.md`. L'assistant le reçoit avec les instructions. Il doit être cité dans les instructions, avec le moment où l'utiliser.
- **Sous-skill** : un fichier `dossier/SKILL.md` avec son propre en-tête `---` (`name`, `description`). C'est un skill à part, que l'assistant trouve seul et qui **ne reçoit que son propre texte** : il ne voit ni les instructions principales ni les documents.

### Citer un fichier

Une citation est un mot qui finit par `.md` dans le texte, par exemple `regles/relances.md`.
- Les liens `http(s)://…` sont ignorés.
- `SKILL.md` seul n'est pas une citation.
- Le nom de fichier seul (`relances.md`) compte quand un seul fichier porte ce nom.
- Le préfixe `references/` (dossier des archives ZIP) est accepté : `references/regles/relances.md` cite `regles/relances.md`.

---

## 3. Limites (`.env` du backend)

| Variable | Défaut | Portée |
|---|---|---|
| `SKILLS_MAX_SLUG_LENGTH` | 64 | Identifiant du skill et nom des sous-skills |
| `SKILLS_MAX_TITLE_LENGTH` | 200 | Nom court |
| `SKILLS_MIN_DESCRIPTION_LENGTH` | 20 | Description (skill et sous-skills) |
| `SKILLS_MAX_DESCRIPTION_LENGTH` | 1024 | Description (skill et sous-skills) |
| `SKILLS_MAX_BODY_LINES` | 500 | Instructions |
| `SKILLS_MAX_BODY_CHARS` | 20000 | Instructions |
| `SKILLS_MAX_REFERENCE_FILES` | 15 | Nombre de fichiers de référence |
| `SKILLS_MAX_REFERENCE_FILE_CHARS` | 8000 | Taille d'un fichier de référence |
| `SKILLS_MAX_TOTAL_REFERENCES_CHARS` | 120000 | Taille de tous les fichiers de référence |
| `SKILLS_ZIP_MAX_ARCHIVE_BYTES` | 1 048 576 | Taille d'une archive importée |
| `SKILLS_ZIP_MAX_UNCOMPRESSED_BYTES` | 1 048 576 | Taille décompressée d'une archive |

Le nombre maximal de fichiers d'une archive ZIP n'est pas réglable : c'est `SKILL.md` + `SKILLS_MAX_REFERENCE_FILES`.

Dans l'éditeur, chaque compteur passe à l'**orange à 90 %** de sa limite et au **rouge au-delà**.

---

## 4. Règles bloquantes (l'enregistrement est refusé)

### Identité
| Code | Règle |
|---|---|
| `slug_required` | L'identifiant est vide. |
| `slug_too_long` | L'identifiant dépasse `SKILLS_MAX_SLUG_LENGTH`. |
| `slug_format` | Caractères autres que minuscules, chiffres et tirets. |
| `slug_reserved_prefix` | Commence par `claude` ou `anthropic`. |
| `slug_reserved_word` | Mot réservé (`import`, `export`, `limits`, `connection`…). |
| `slug_folder_mismatch` | Import : le dossier et l'identifiant diffèrent. |
| `title_required`, `title_too_long` | Nom court vide ou trop long. |
| `duplicate_name` | Un autre skill porte déjà ce nom pour les mêmes ERP. |

### Description
| Code | Règle |
|---|---|
| `description_required` | Vide. |
| `description_too_short`, `description_too_long` | Hors des limites. |
| `description_angles` | Contient `<` ou `>`. |

### Instructions
| Code | Règle |
|---|---|
| `body_required` | Vides. |
| `body_too_long`, `body_too_many_lines` | Hors des limites. |
| `body_yaml_header` | Les instructions commencent par un en-tête `---` (avec au moins une ligne `clé: valeur`). Le nom et la description ont leurs propres champs. Une simple ligne de séparation `---` n'est pas concernée. |

### Classement, portée et ERP
| Code | Règle |
|---|---|
| `category_invalid`, `kind_invalid`, `scope_invalid` | Valeur hors liste. |
| `erp_invalid` | ERP au format invalide. |
| `erp_not_connected` | Un utilisateur non administrateur choisit un ERP auquel il n'est pas connecté. |
| `scope_erp_missing` | Portée « Spécifique ERP » sans ERP. |
| `scope_global_bound`, `scope_erp_bound`, `scope_tenant_bound`, `scope_tenant_missing`, `scope_user_owner` | Portée incohérente avec l'organisation ou le propriétaire. |

### Fichiers de référence
| Code | Règle |
|---|---|
| `refs_malformed` | La liste des fichiers n'est pas un objet nom → texte. |
| `refs_too_many`, `ref_too_long`, `refs_total_too_long` | Hors des limites. |
| `ref_name_invalid` | Le nom ne finit pas par `.md`, ou contient des caractères interdits ou `..`. |
| `ref_root_skill` | Un `SKILL.md` à la racine des références. |
| `ref_subskill_folder_invalid` | Le dossier d'un `SKILL.md` n'est pas un identifiant valide. |
| `ref_subskill_name_invalid` | Le `name:` de l'en-tête d'un sous-skill n'est pas un identifiant valide (c'est lui qu'on tape après `/`). |
| `ref_content_invalid` | Un fichier sans contenu texte. |
| `ref_duplicate_name` | Deux fichiers ont le même nom court, même dans des dossiers différents (`regles/sage.md` et `sage/SKILL.md` s'appellent tous deux « sage »). |

### Historique
| Code | Règle |
|---|---|
| `comment_required` | « Ce qui a changé » est vide. Obligatoire à **toute modification** d'un skill existant (y compris une copie personnelle d'un skill partagé), à la **création d'un skill partagé** (`TENANT`, `ERP`, `GLOBAL`) et à l'**import qui remplace** un skill existant. Seule la création d'un skill personnel en est dispensée (historique : « Initial version »). Règle appliquée par l'éditeur **et** par le backend. |
| `version_invalid` | Numéro de version invalide. |

---

## 5. Avertissements (l'enregistrement reste possible)

Un avertissement peut être masqué avec « C'est voulu », pour ce skill et ce cas précis (`code` + `term`). Pour un skill pas encore créé, ce choix ne vaut que pendant l'édition en cours.

### Description
| Code | Règle |
|---|---|
| `no_exclusion` | Pas de « Pas pour » (ou équivalent : « ne pas utiliser », « ne s'applique pas »). |
| `description_duplicate` | Description identique (casse et espaces ignorés) à celle d'un autre skill accessible ou d'un sous-skill. |
| `similar_name` | Nom très proche d'un autre skill accessible. |

### Instructions
| Code | Règle |
|---|---|
| `body_starter_unchanged` | Le texte de départ de l'éditeur (« Décrivez ici… ») est toujours là. Remplace `short_body`. |
| `short_body` | Moins de 120 caractères de texte réel (titres et symboles exclus). |
| `heading_empty` | Un titre sans texte avant le titre suivant de même niveau ou de niveau supérieur. |
| `heading_duplicate` | Le même titre deux fois au même niveau sous le même parent. |
| `code_block_unclosed` | Un bloc de code ouvert par ` ``` ` ou `~~~` n'est jamais fermé. |

### Citations
| Code | Règle |
|---|---|
| `citation_missing` | Un fichier cité (dans les instructions ou un fichier de référence) n'existe pas. |
| `subskill_cites_reference` | Un sous-skill cite un fichier existant, qu'il ne reçoit jamais. Jamais en même temps que `citation_missing` pour la même citation. |
| `ref_uncited` | Un document n'est cité nulle part (les citations venant d'un sous-skill ne comptent pas). Ne concerne pas les sous-skills. |

### Documents
Un seul de ces trois avertissements par document, dans cet ordre de priorité : `ref_starter_unchanged` > `ref_empty` > `ref_uncited`.

| Code | Règle |
|---|---|
| `ref_starter_unchanged` | Le texte de départ de l'éditeur est toujours là. |
| `ref_empty` | Fichier vide, ou un titre seul. |
| `ref_header_not_subskill` | Le document a un en-tête de sous-skill mais ne s'appelle pas `SKILL.md`. |
| `ref_code_block_unclosed` | Bloc de code non fermé. |

### Sous-skills
| Code | Règle |
|---|---|
| `ref_subskill_header_unreadable` | En-tête absent, illisible (YAML invalide) ou sans `name` / `description`. |
| `ref_starter_unchanged` | La description de départ (« Quand on demande … Pas pour … ») n'a pas été changée. |
| `ref_subskill_description_length` | Description hors des limites. |
| `ref_subskill_description_angles` | Description avec `<` ou `>`. |
| `ref_subskill_no_exclusion` | Description sans « Pas pour ». |
| `ref_subskill_no_body` | En-tête présent mais aucune instruction après. |
| `ref_subskill_name_mismatch` | Le `name:` de l'en-tête diffère du nom du dossier. |
| `ref_subskill_name_taken` | Le nom est déjà celui du skill lui-même ou d'un autre skill ou sous-skill accessible. |
| `ref_code_block_unclosed` | Bloc de code non fermé. |

### Outils et ERP
| Code | Règle |
|---|---|
| `tool_name_no_erp` | Skill pour tous les ERP qui cite un outil d'un ERP précis. |
| `technical_name_no_erp` | Skill pour tous les ERP qui cite un nom technique (colonne, champ avec `_`). |
| `tool_other_erp` | Skill lié à des ERP qui cite un outil d'un autre ERP connecté. |
| `tool_typo` | Nom très proche d'un outil réel de l'ERP choisi (faute de frappe probable). |

---

## 6. Informations

| Code | Règle |
|---|---|
| `section_missing` | Section recommandée absente : « Objectif » pour un style, « Démarche » pour une méthode. Le titre est reconnu à n'importe quel niveau, sans tenir compte des accents ni de la casse. |
| `subskill_nested` | Un sous-skill est rangé dans le dossier d'un autre sous-skill. |
| `tools_unchecked` | Les noms d'outils n'ont pas pu être vérifiés (ERP non connecté ou indisponible). |

---

## 7. Comportement de l'éditeur

- **Vérification continue** : le brouillon est envoyé à `/check` 0,8 s après chaque modification. Le résumé en bas indique les points bloquants et les avertissements ; la liste détaillée explique chaque problème.
- **Aller au problème** : cliquer sur le titre d'un problème ouvre l'onglet Références sur le bon fichier, ou le champ concerné avec le mot sélectionné.
- **Contour des champs** : rouge pour un problème bloquant, orange pour un avertissement.
- **Textes de départ** : ceux du backend (`skillStarters.ts`), pour les instructions en mode expert, les nouveaux documents et les nouveaux sous-skills.
- **Renommer un fichier** : l'éditeur demande au backend où le fichier est cité et propose de mettre à jour ces citations. Chacune garde sa forme : un nom seul reste un nom seul, un chemin devient le nouveau chemin.
- **Supprimer un fichier cité** : l'éditeur demande confirmation en listant les endroits qui le citent.
- **Fermer avec des modifications non enregistrées** : l'éditeur demande confirmation.
- **« Ce qui a changé »** : affiché et obligatoire pour toute modification et pour les skills partagés.

---

## 8. Import (SKILL.md, ZIP, URL)

- Un import passe par les **mêmes règles** que l'éditeur.
- Archive ZIP : `<slug>/SKILL.md` et des fichiers `.md` sous `references/`. Tout autre fichier, chemin avec `..`, barre oblique inverse ou chemin absolu est refusé.
- En-tête de `SKILL.md` : seules les clés `name`, `description`, `compatibility` et `metadata` sont acceptées.
- Si l'import **remplace** un skill existant (même nom, même portée, même ERP principal), « Ce qui a changé » est demandé avant de continuer.

---

## 9. Skills du catalogue

Les skills du dossier `Vmind_Backend/skills-catalog/` sont chargés au démarrage du backend :
- un skill absent de la base est créé (`source='catalog'`) ;
- un skill qui suit encore le catalogue est mis à jour quand ses fichiers changent, avec une nouvelle version dans l'historique ;
- un skill **modifié dans l'interface** (`source='ui'`) n'est **jamais écrasé** au démarrage.

Quand le catalogue contient une version plus récente d'un skill modifié dans l'interface, un administrateur de la plateforme voit **« Mettre à jour depuis le catalogue »** dans les actions du skill. Ce bouton remplace le contenu par celui du catalogue (`POST /api/skills/:id/catalog-update`). La version modifiée reste dans l'historique et peut être restaurée, et le skill suit à nouveau le catalogue aux démarrages suivants.

---

## 10. Routes du module

| Route | Rôle |
|---|---|
| `GET /api/skills/limits` | Limites et textes de départ de l'éditeur. |
| `GET /api/skills/connection` | Connexion active pour l'éditeur (connecté, ERP, client), sans appel à l'ERP. |
| `POST /api/skills/check` | Règles bloquantes, avertissements, informations et carte des citations d'un brouillon. |
| `POST /api/skills` | Création. |
| `PUT /api/skills/:id` | Modification (commentaire obligatoire). |
| `POST /api/skills/import` | Import SKILL.md, ZIP ou URL. |
| `GET /api/skills/:id/export` | Export ZIP. |
| `GET /api/skills/:id/versions` | Historique. |
| `POST /api/skills/:id/rollback` | Restauration d'une version. |
| `POST /api/skills/:id/catalog-update` | Administrateurs : appliquer la version du catalogue. |
