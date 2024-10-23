// https://www.typescriptlang.org/docs/handbook/modules/reference.html#export--and-import--require
import http = require("node:http");

const server = http.createServer((request, response) => {
  const { headers } = request;
  const tes = { key: "value" };
  let body: any = [];
  request
    .on("error", err => {
      console.log(err.stack);
    })
    .on("data", chunk => {
      body.push(chunk);
    })
    .on("end", () => {
      Buffer.concat(body).toString();
    });
});

server.listen(3000);
