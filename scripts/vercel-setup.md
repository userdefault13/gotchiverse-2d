# Create the Vercel project (manual / CLI)

Cloud agent environments cannot authenticate the Vercel MCP or CLI without your token.
Run this once from a machine logged into Vercel (or after `vercel login`):

```bash
cd gotchiverse-2d
npx vercel link --yes
# Import as a NEW project (do not reuse an old Gotchiverse project)

# Set env vars from docs/vercel-env.example, e.g.:
while IFS= read -r line; do
  [[ "$line" =~ ^#.*$ || -z "$line" ]] && continue
  key="${line%%=*}"
  val="${line#*=}"
  echo "$val" | npx vercel env add "$key" production
done < docs/vercel-env.example

npx vercel --prod
```

Or in the Vercel dashboard: **Add New Project** → import `userdefault13/gotchiverse-2d` → paste env from `docs/vercel-env.example` → Deploy.
