import {
  abc
} from "https://deno.land/x/abc/mod.ts";

const app = abc();

app.get("/", c => "Hello World");

app.get("/hello/:name", c => ({
  hello: c.params.name
}));

app.start(":8000")
console.log('Running on http://localhost:8000')