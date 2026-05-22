# AI Workflow Guidelines

## Claude Expectations

Before coding:

1. inspect nearby files
2. understand current patterns
3. reuse utilities first
4. minimize changes
5. avoid architectural drift

---

# Preferred Workflow

1. understand feature
2. inspect existing implementation
3. identify reusable pieces
4. implement minimal clean solution
5. preserve consistency

---

# Refactoring Rules

Do:
- simplify logic
- reduce duplication
- improve readability

Do not:
- rewrite unrelated code
- introduce new patterns casually
- overabstract

---

# Dependency Rules

Before adding dependencies:
- check existing utilities
- prefer native/browser APIs
- justify bundle impact

---

# Code Generation Standards

Generated code must be:
- production-ready
- typed
- maintainable
- readable
- minimal
- scalable

Avoid placeholders unless requested.