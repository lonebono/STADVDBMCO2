# Update system
apt update && apt upgrade -y

# Install MySQL
apt install -y mysql-server
systemctl enable mysql
systemctl start mysql

# Allow remote MySQL access
sed -i "s/^bind-address.*/bind-address = 0.0.0.0/" /etc/mysql/mysql.conf.d/mysqld.cnf
systemctl restart mysql

# Create database and user
mysql -e "CREATE DATABASE IF NOT EXISTS imdbDDB;"
mysql -e "CREATE USER IF NOT EXISTS 'mco2'@'%' IDENTIFIED BY 'stadvdbgroup10';"
mysql -e "GRANT ALL PRIVILEGES ON imdbDDB.* TO 'mco2'@'%'; FLUSH PRIVILEGES;"

# Intall curl
apt install -y curl

# Install Node.js LTS
curl -fsSL https://deb.nodesource.com/setup_lts.x | bash -
apt install -y nodejs

# Install pm2 (process manager)
npm install -g pm2

# Install git
apt install -y git
