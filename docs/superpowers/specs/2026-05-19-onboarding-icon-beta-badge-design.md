# Spec: Ícone maior + badge beta na OnboardingScreen

**Data:** 2026-05-19
**Componente:** `OnboardingScreen` em `index.html:3127`

## O que muda

Duas alterações visuais no bloco hero da tela de onboarding. Sem impacto em lógica, estado ou outros componentes.

### 1. Ícone maior

| Elemento | Antes | Depois |
|---------|-------|--------|
| Container (`div` wrapper) | `width:116, height:116, borderRadius:32` | `width:136, height:136, borderRadius:36` |
| `<img>` | `width="100" height="100"` | `width="116" height="116"` |
| `borderRadius` da img | `26` | `30` |

### 2. Badge BETA no canto do ícone (opção A)

`div` posicionado absolutamente no canto `bottom:-6px, right:-6px` do wrapper relativo que envolve o ícone:

```
background: #E8B63E
color: #6B3F00
font-size: 10px / font-weight: 800
padding: 3px 8px / border-radius: 20px
letter-spacing: 0.8px
box-shadow: 0 2px 8px rgba(0,0,0,0.25)
border: 2px solid rgba(255,255,255,0.95)
texto: BETA
```

O wrapper do ícone precisa de `position: relative` para o badge absolute funcionar.

### 3. Pill "ACESSO BETA FECHADO" abaixo do tagline (opção C)

`div` inserido após o tagline "Clareza. Controle. Liberdade.", com `marginTop` separando do tagline e antes do fechamento do hero `div`:

```
background: rgba(255,255,255,0.11)
color: rgba(255,255,255,0.82)
font-size: 10px / font-weight: 700
padding: 5px 14px / border-radius: 20px
letter-spacing: 1.1px
border: 1px solid rgba(255,255,255,0.22)
texto: ✦ ACESSO BETA FECHADO ✦
```

O tagline precisa de `marginBottom: 12px` (antes era sem margem inferior explícita — era `marginBottom: 4` no título).

## Arquivos afetados

- `index.html` — apenas `OnboardingScreen` (~linha 3146–3159)

## Fora de escopo

- Nenhuma alteração de lógica, estado, roteamento ou outros componentes.
- Nenhum novo arquivo.
