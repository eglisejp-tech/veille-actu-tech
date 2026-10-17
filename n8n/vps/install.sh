#!/usr/bin/env bash
# Installation de n8n sur un VPS Ubuntu/Debian neuf. À lancer en root, depuis /opt/n8n :
#   bash /opt/n8n/install.sh
# Relançable sans risque : chaque étape vérifie si elle est déjà faite.
set -euo pipefail
cd "$(dirname "$0")"

etape() { printf '\n\033[1;34m==> %s\033[0m\n' "$1"; }

[ "$(id -u)" -eq 0 ] || { echo "À lancer en root (ssh root@…)."; exit 1; }
. /etc/os-release
case "$ID" in ubuntu|debian) ;; *) echo "Système $ID non prévu (Ubuntu ou Debian attendu)."; exit 1 ;; esac

etape "Mises à jour du système"
export DEBIAN_FRONTEND=noninteractive
apt-get update -q
apt-get upgrade -yq
apt-get install -yq ca-certificates curl ufw fail2ban unattended-upgrades

etape "Mises à jour de sécurité automatiques"
dpkg-reconfigure -f noninteractive unattended-upgrades

etape "Docker"
if ! command -v docker >/dev/null; then
  curl -fsSL https://get.docker.com | sh
fi
systemctl enable --now docker

etape "Pare-feu : seuls SSH (22), HTTP (80) et HTTPS (443) sont ouverts"
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw --force enable

etape "Protection contre les tentatives de connexion SSH (fail2ban)"
systemctl enable --now fail2ban

etape "Configuration"
[ -f .env ] || cp .env.example .env
. ./.env
echo "Adresse prévue : https://$DOMAIN"
IP_DNS=$(getent ahostsv4 "$DOMAIN" | awk 'NR==1{print $1}' || true)
IP_VPS=$(curl -4 -fsS https://ifconfig.me || true)
if [ "$IP_DNS" != "$IP_VPS" ]; then
  echo "⚠️  $DOMAIN pointe vers '${IP_DNS:-rien}' au lieu de $IP_VPS."
  echo "   Le certificat HTTPS ne pourra pas être créé tant que le DNS n'est pas corrigé (voir le guide)."
  echo "   n8n démarre quand même : accès en secours par tunnel SSH."
fi

etape "Sauvegarde quotidienne (3 h du matin, 14 jours gardés)"
chmod +x backup.sh
echo "0 3 * * * root /opt/n8n/backup.sh >> /var/log/n8n-backup.log 2>&1" > /etc/cron.d/n8n-backup

etape "Démarrage de n8n"
docker compose pull
docker compose up -d
sleep 5
docker compose ps

cat <<EOF

✅ Terminé.
   Ouvre https://$DOMAIN tout de suite et crée le compte propriétaire
   (le premier compte créé devient administrateur).
   n8n redémarre seul après un plantage ou un redémarrage du VPS.
EOF
