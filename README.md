# utopia-gpt
Autonomous bots that connect to multiple APIs and generate information

| ![UtopiaGPT Screenshot 1](https://i.imgur.com/dNTh4YL.png) |
|-|

| ![UtopiaGPT Screenshot 2](https://i.imgur.com/LIa0CTK.png) |
|-|

| ![UtopiaGPT Screenshot 3](https://i.imgur.com/gX5dfw2.png) |
|-|

## How to run

```
Import database/create-tables.sql into MySQL
Copy and edit secret-config-base.json and rename it secret-config.json
Copy and edit frontend/src/config-base.json and rename it config.json
npm install
cd frontend
npm install
npm run build
cd ..
npm start
Go to the browser at localhost:4003
```