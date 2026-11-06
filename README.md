# Online Shopping and Order Management System

A simple practical-exam project using Node.js, Express, SQLite, HTML, CSS, JavaScript, Selenium and Docker.

## Features
- Customer registration and login
- Product catalogue and product search
- Add products to cart
- Update cart quantity
- Checkout and order placement
- Customer order history
- Admin product management (add, update and delete through API)

## Requirements
- Node.js and npm
- Google Chrome (for Selenium tests)
- Docker Desktop (for Docker)
- Jenkins with Git, Node.js/npm and Docker available on the build agent

## Run locally
```bash
npm install
npm start
```
Open http://localhost:3000

## Demo admin credentials
- Email: `admin@shop.test`
- Password: `admin123`

Customers can register through the registration form.

## Selenium tests
Start the app in one terminal:
```bash
npm start
```
In a second terminal:
```bash
npm test
```
Selenium Manager may download/use a compatible ChromeDriver. Chrome must be installed.

## Docker
```bash
docker build -t online-shopping-system .
docker run -d --name online-shopping-container -p 3000:3000 online-shopping-system
```
Open http://localhost:3000

Stop the container:
```bash
docker stop online-shopping-container
```

## GitHub
```bash
git init
git add .
git commit -m "Initial commit - Online Shopping System"
git branch -M main
git remote add origin https://github.com/USERNAME/Online-Shopping-System.git
git push -u origin main
```

## Notes
This is an educational demonstration application. Passwords are stored as plain text and the default session secret is for local demonstration only. Do not use real customer information or deploy publicly without adding password hashing, environment-based secrets, production session storage, validation, CSRF protection and other security controls.
