# n8n sur le VPS Contabo — installation unique

Résultat : n8n tourne 24 h/24 sur **https://n8n.netbudget.app**. Il redémarre seul (plantage, redémarrage du VPS),
garde ses données dans un volume Docker, est sauvegardé chaque nuit et n'a plus besoin de ton Mac.

| Élément | Valeur |
|---|---|
| VPS | Contabo VPS Cloud 4, IP `213.136.88.29`, utilisateur `root` |
| Adresse n8n | https://n8n.netbudget.app |
| Dossier sur le VPS | `/opt/n8n` |
| Données | volume Docker `n8n_data`, sauvegardé dans `/opt/n8n/backups` |

Compte environ 30 minutes au total. Les blocs `sur ton Mac` se tapent dans le Terminal du Mac, les blocs `sur le VPS`
une fois connecté au serveur.

---

## Étape 1 — Créer l'adresse n8n.netbudget.app (Cloudflare, 3 min)

À faire en premier : le DNS met quelques minutes à se propager.

1. Va sur dash.cloudflare.com > **netbudget.app** > **DNS** > **Records** > **Add record**.
2. Remplis :
   - Type : `A`
   - Name : `n8n`
   - IPv4 address : `213.136.88.29`
   - Proxy status : **DNS only** (nuage **gris**, pas orange)
3. **Save**.

Le nuage doit être gris pour que le serveur puisse obtenir son certificat HTTPS lui-même.

## Étape 2 — Se connecter au VPS (2 min)

Sur ton Mac :
```bash
ssh root@213.136.88.29
```
- Au premier essai, la question « Are you sure you want to continue connecting? » apparaît : tape `yes`.
- Mot de passe : celui choisi lors de la commande Contabo. Rien ne s'affiche quand tu le tapes, c'est normal.

Une fois connecté, vérifie le système :
```bash
cat /etc/os-release | head -2
```
Il faut **Ubuntu** ou **Debian**. Si c'est autre chose, réinstalle Ubuntu 24.04 depuis l'espace client Contabo
(« Reinstall ») avant de continuer.

Tape `exit` pour revenir sur ton Mac.

## Étape 3 — Se connecter avec une clé plutôt qu'un mot de passe (5 min, recommandé)

Un serveur exposé sur Internet reçoit des tentatives de connexion en continu. Une clé SSH est bien plus sûre qu'un mot de passe.

Sur ton Mac :
```bash
ls ~/.ssh/id_ed25519.pub || ssh-keygen -t ed25519
ssh-copy-id root@213.136.88.29
```
Le mot de passe est demandé une dernière fois. Teste ensuite `ssh root@213.136.88.29` : tu dois entrer **sans mot de passe**
(ou seulement avec la phrase de ta clé).

Si ça marche, désactive la connexion par mot de passe. Sur le VPS :
```bash
echo "PasswordAuthentication no" > /etc/ssh/sshd_config.d/00-cle-uniquement.conf
systemctl reload ssh || systemctl reload sshd
```
⚠️ **Avant de fermer cette session**, ouvre un **nouveau** Terminal et vérifie que `ssh root@213.136.88.29` marche toujours.
En cas de problème, la session encore ouverte te permet d'annuler (`rm /etc/ssh/sshd_config.d/00-cle-uniquement.conf`).
En dernier recours, la console VNC de Contabo permet toujours d'accéder au serveur.

## Étape 4 — Envoyer les fichiers sur le VPS (1 min)

Sur ton Mac :
```bash
scp -r ~/Documents/perso/eglise/ejp-tech/veille-actu-tech/n8n/vps root@213.136.88.29:/opt/n8n
```
Fichiers envoyés : `docker-compose.yml` (n8n, Gotenberg pour dessiner les carrousels, Caddy pour le HTTPS), `Caddyfile`, `.env.example` (l'adresse),
`install.sh` et `backup.sh`.

## Étape 5 — Installer (5 min, automatique)

Sur le VPS :
```bash
bash /opt/n8n/install.sh
```
Le script fait tout, dans l'ordre :
- mises à jour du système, puis mises à jour de sécurité automatiques ;
- installation de Docker ;
- pare-feu : seuls SSH, HTTP et HTTPS restent ouverts ;
- fail2ban, contre les tentatives de connexion répétées ;
- sauvegarde chaque nuit à 3 h ;
- démarrage de n8n.

Il signale aussi si le DNS de l'étape 1 n'est pas encore prêt. Tu peux le relancer autant de fois que nécessaire.

## Étape 6 — Créer ton compte n8n (tout de suite, 2 min)

Ouvre **https://n8n.netbudget.app** dès la fin de l'installation et crée ton compte. **Le premier compte créé devient
administrateur** : ne laisse pas la page d'inscription ouverte à n'importe qui.

Si la page ne s'ouvre pas (DNS pas encore propagé), attends 10 minutes. Puis, sur le VPS :
```bash
cd /opt/n8n && docker compose restart caddy
```

## Étape 7 — Transférer le workflow depuis ton Mac (10 min)

1. **Sur le n8n de ton Mac**, ouvre chaque workflow (EJP Tech Décrypte, puis Alerte erreur si tu l'as créé),
   menu **⋯** > **Download**. Tu obtiens un fichier `.json` par workflow.
2. **Sur https://n8n.netbudget.app** : **Create workflow** > **⋯** > **Import from File…**, une fois par fichier.
3. Recrée les 2 credentials (elles ne voyagent pas avec les fichiers, pour des raisons de sécurité) :
   - **Anthropic API** (Header Auth) : Name `x-api-key`, Value ta clé `sk-ant-…` ;
   - **ClickUp** : ta clé `pk_…`.
   Puis resélectionne-les dans le nœud 6 et dans le nœud ClickUp.
4. Workflow EJP Tech Décrypte : **⋯** > **Settings** > **Error workflow** > Alerte erreur.
5. Lance un test (**Execute workflow**), vérifie la tâche ClickUp, puis clique sur **Publish**.
6. **Arrête le n8n du Mac**, sinon les deux lanceront le workflow à 10 h et tu auras deux tâches :
   ```bash
   docker stop n8n && docker update --restart=no n8n
   ```
   (sur ton Mac ; si le conteneur porte un autre nom, `docker ps` te le donne)

C'est fini : plus rien à faire au quotidien.

---

## Au quotidien : rien. Pour information :

| Besoin | Commande (sur le VPS) |
|---|---|
| Voir si tout tourne | `cd /opt/n8n && docker compose ps` |
| Voir les journaux | `cd /opt/n8n && docker compose logs -f --tail 100 n8n` |
| Mettre n8n à jour (tous les 1 à 2 mois) | `cd /opt/n8n && docker compose pull && docker compose up -d` |
| Sauvegarder maintenant | `/opt/n8n/backup.sh` |
| Lister les sauvegardes | `ls -lh /opt/n8n/backups` |
| Redémarrer n8n | `cd /opt/n8n && docker compose restart n8n` |

**Restaurer une sauvegarde** (par exemple après une mauvaise manipulation) :
```bash
cd /opt/n8n && docker compose stop n8n
docker run --rm -v n8n_data:/data -v /opt/n8n/backups:/b alpine sh -c "rm -rf /data/* /data/.[!.]* ; tar xzf /b/n8n-AAAA-MM-JJ.tgz -C /data"
docker compose start n8n
```

**Copier les sauvegardes sur ton Mac** de temps en temps (si le VPS disparaît, les sauvegardes aussi) :
```bash
scp -r root@213.136.88.29:/opt/n8n/backups ~/Documents/perso/eglise/ejp-tech/sauvegardes-n8n
```

**Accès de secours** si https://n8n.netbudget.app ne répond plus (problème de certificat ou de DNS) :
```bash
ssh -L 5678:localhost:5678 root@213.136.88.29
```
puis ouvre http://localhost:5678 sur ton Mac, tant que ce Terminal reste ouvert.

## Sécurité, en résumé

- n8n n'est pas exposé directement : seul Caddy (HTTPS) l'est, et le port 5678 n'écoute que sur le serveur lui-même.
- Certificat HTTPS gratuit, renouvelé automatiquement.
- Pare-feu, fail2ban, mises à jour de sécurité automatiques, connexion SSH par clé uniquement.
- Les sauvegardes contiennent la clé de chiffrement des credentials : ne les partage pas.
- Pour inviter l'équipe : dans n8n, **Settings > Users** (chacun son compte, ne partagez pas le tien).
