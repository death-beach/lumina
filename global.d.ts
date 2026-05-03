// Type declarations for CSS file imports.
// Next.js (with Turbopack) handles the actual loading; this file only
// tells the TypeScript compiler that importing a CSS file is valid.
declare module "*.css" {
  // CSS Modules (e.g. import styles from './foo.module.css')
  const content: Record<string, string>;
  export default content;
}
