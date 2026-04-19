import re

files = [
    "src/app/api/bitquery/pumpfun/curve-95/route.ts",
    "src/app/api/bitquery/pumpfun/marketcap-jumps/route.ts"
]

for f in files:
    with open(f, "r") as file:
        content = file.read()

    content = content.replace("return new Response(body,", "return new Response(body as any,")

    with open(f, "w") as file:
        file.write(content)
