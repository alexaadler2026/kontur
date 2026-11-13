// Enforces Conventional Commits (feat:, fix:, docs:, chore:, ...) on every commit message.
// Rules: https://www.conventionalcommits.org — checked by the .husky/commit-msg hook.
export default {
  extends: ['@commitlint/config-conventional'],
};
