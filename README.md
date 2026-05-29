# CLI Portfolio

A beautifully crafted, terminal-based portfolio to showcase your skills, projects, and journey directly in the command line. Meet people where they code!

## Features

- 🚀 Fully interactive terminal interface.
- 🎨 Multiple built-in themes (Cyber Nebula, and more).
- 🧑‍💻 Easily customizable through a single `config.json` or `data.js` file.
- 🔗 Direct links to your GitHub, LinkedIn, Website, and Resume.
- 📦 Can be published to npm and executed via `npx your-cli-portfolio`.

## How to Make It Your Own

Follow these simple steps to customize the portfolio with your own details and publish it.

### 1. Update Your Information

You have two options to update the content:
- **Option A (Recommended):** Edit the `config.json` file in the root directory. This file is parsed automatically.
- **Option B:** Edit the `src/data.js` file, which acts as the fallback data if `config.json` is missing.

Replace the dummy data (Name, Bio, Skills, Projects, Social Links, etc.) with your own.

### 2. Update `package.json`

Open `package.json` and change the following fields:
- `"name"`: Change `"your-cli-portfolio"` to a unique name (e.g., `"john-doe-cli"`). This will be your npm package name.
- `"version"`: Keep it at `"1.0.0"` or change it as needed.
- `"author"`: Put your name.
- `"description"`: Write a short description.
- `"bin"`: Change `"my-cli"` to the command you want users to type (e.g., `"john-cli"`).

### 3. Test Locally

To test how your CLI portfolio looks before publishing, run:

```bash
npm install
npm start
```
Or, you can link it globally to test the CLI command:
```bash
npm link
# Now you can run the command you set in the "bin" field of package.json
my-cli
```

### 4. Publish to npm

Once you are happy with the result, you can share it with the world!

1. Create an account on [npmjs.com](https://www.npmjs.com/).
2. Login to your npm account from the terminal:
   ```bash
   npm login
   ```
3. Publish your package:
   ```bash
   npm publish
   ```

*(Note: If your package name is already taken, you might need to change it in `package.json`.)*

### 5. Run via npx

Once published, anyone can view your portfolio by running:

```bash
npx your-cli-portfolio
```
*(Replace `your-cli-portfolio` with the actual name of your package).*

## Contributing

Feel free to fork this repository and submit pull requests if you want to add new themes, animations, or features!

## License

MIT License.