#!/usr/bin/env bash
# Sauvegarde du volume n8n_data (workflows, credentials, clé de chiffrement, historique).
# Lancé chaque nuit par /etc/cron.d/n8n-backup. Garde les 14 dernières archives dans /opt/n8n/backups.
set -euo pipefail
DEST=/opt/n8n/backups
mkdir -p "$DEST"
docker run --rm -v n8n_data:/data:ro -v "$DEST":/backup alpine \
  tar czf "/backup/n8n-$(date +%F).tgz" -C /data .
ls -1t "$DEST"/n8n-*.tgz | tail -n +15 | xargs -r rm --
echo "$(date '+%F %T') sauvegarde OK"
