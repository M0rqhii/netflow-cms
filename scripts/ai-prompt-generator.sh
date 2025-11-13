#!/bin/bash
# AI Prompt Generator
# Generates prompts for different AI models based on task

set -e

AGENT_TYPE=$1
TASK_ID=$2
MODEL=${3:-"chatgpt"}  # chatgpt, claude, gemini, cursor

if [ -z "$AGENT_TYPE" ] || [ -z "$TASK_ID" ]; then
    echo "Usage: $0 <agent_type> <task_id> [model]"
    echo ""
    echo "Agent types: backend, frontend, qa, infra, docs"
    echo "Models: chatgpt, claude, gemini, cursor"
    echo ""
    echo "Example: $0 backend TNT-015 chatgpt"
    exit 1
fi

# Load task info from plan.md
TASK_INFO=$(grep -A 20 "TNT-$TASK_ID" docs/plan.md 2>/dev/null || echo "")

case $AGENT_TYPE in
    backend)
        AGENT_NAME="Backend Codex"
        AGENT_DESC="specjalistą od NestJS + Prisma + PostgreSQL"
        FOCUS="API endpoints, business logic, database layer, multi-tenant isolation"
        ;;
    frontend)
        AGENT_NAME="Frontend Maestro"
        AGENT_DESC="specjalistą od Next.js + React + Tailwind"
        FOCUS="UI components, pages, state management, accessibility"
        ;;
    qa)
        AGENT_NAME="QA Tester"
        AGENT_DESC="specjalistą od testów (Vitest + Playwright)"
        FOCUS="unit tests, integration tests, E2E tests, security tests"
        ;;
    infra)
        AGENT_NAME="Infra DevOps"
        AGENT_DESC="specjalistą od Docker + CI/CD"
        FOCUS="containerization, CI/CD pipelines, monitoring, deployment"
        ;;
    docs)
        AGENT_NAME="Doc Writer"
        AGENT_DESC="specjalistą od dokumentacji"
        FOCUS="README, changelog, API docs, PR notes"
        ;;
    *)
        echo "Unknown agent type: $AGENT_TYPE"
        exit 1
        ;;
esac

case $MODEL in
    chatgpt)
        PROMPT=$(cat <<EOF
Jesteś $AGENT_NAME - $AGENT_DESC pracujący nad projektem Multi-Tenant Headless CMS.

## Kontekst Projektu
Przeczytaj te dokumenty przed rozpoczęciem:
- context-instructions.md (systemowe zasady)
- docs/prd.md (wymagania funkcjonalne - znajdź sekcję związaną z zadaniem)
- docs/plan.md (zadanie TNT-$TASK_ID)
- docs/subagents-config.md (sekcja $AGENT_NAME - format input/output)
- .aicli/commands.yaml (komendy do generowania kodu)

## Zadanie
$TASK_INFO

## Wymagania
- Zgodność ze standardami z context-instructions.md
- Multi-tenant isolation (zawsze tenantId)
- Testy obowiązkowe (>80% coverage)
- Dokumentacja aktualna
- $FOCUS

## Output Format (zgodnie z docs/subagents-config.md)
- Kod zgodny ze standardami projektu
- Testy jednostkowe i integracyjne
- Release notes (CHANGELOG.md)
- Aktualizacja dokumentacji

## Stack Technologiczny
$(case $AGENT_TYPE in
    backend) echo "- NestJS 10+, Prisma 5+, PostgreSQL 14+, Redis 6+, Zod" ;;
    frontend) echo "- Next.js 14+, React 18+, Tailwind CSS, TipTap, Zustand" ;;
    qa) echo "- Vitest, Playwright, Jest, axe-core" ;;
    infra) echo "- Docker, GitHub Actions, Kubernetes, Prometheus" ;;
    docs) echo "- Markdown, OpenAPI 3.0, Mermaid" ;;
esac)

Rozpocznij implementację zgodnie z zadaniem TNT-$TASK_ID.
EOF
)
        ;;
    claude)
        PROMPT=$(cat <<EOF
Jesteś $AGENT_NAME - $AGENT_DESC.

## Instrukcje
Przeczytaj dokładnie:
1. context-instructions.md - systemowe zasady działania
2. docs/subagents-config.md - sekcja "$AGENT_NAME" (format input/output)
3. docs/prd.md - wymagania funkcjonalne
4. docs/plan.md - zadanie TNT-$TASK_ID
5. .aicli/commands.yaml - komendy AI CLI

## Zadanie
$TASK_INFO

## Zasady
- Zawsze czytaj kontekst przed działaniem
- Multi-tenant isolation jest krytyczne (tenantId w każdym query)
- Testy są obowiązkowe (>80% coverage)
- Dokumentacja musi być aktualna
- Kod zgodny ze standardami TypeScript strict mode

## Output
Dostarcz kompletny output zgodnie z formatem z docs/subagents-config.md:
1. Kod (implementation)
2. Testy (unit + integration)
3. Release notes
4. Dokumentacja

Rozpocznij pracę nad zadaniem TNT-$TASK_ID.
EOF
)
        ;;
    gemini)
        PROMPT=$(cat <<EOF
Jesteś $AGENT_NAME - $AGENT_DESC w projekcie Multi-Tenant Headless CMS.

## Dokumenty do Przeczytania
- context-instructions.md
- docs/subagents-config.md (sekcja $AGENT_NAME)
- docs/plan.md (zadanie TNT-$TASK_ID)
- docs/prd.md

## Zadanie
$TASK_INFO

## Wymagania
- Zgodność z context-instructions.md
- Multi-tenant isolation (tenantId)
- Testy >80% coverage
- $FOCUS

## Output
Zgodnie z docs/subagents-config.md:
- Kod + Testy + Release Notes + Dokumentacja

Zaimplementuj zadanie TNT-$TASK_ID.
EOF
)
        ;;
    cursor)
        PROMPT=$(cat <<EOF
# Task: TNT-$TASK_ID
# Agent: $AGENT_NAME

## Context Files (read these first)
- context-instructions.md
- docs/subagents-config.md (section: $AGENT_NAME)
- docs/prd.md (find related section)
- docs/plan.md (task: TNT-$TASK_ID)
- .aicli/commands.yaml

## Task Description
$TASK_INFO

## Requirements
- Follow context-instructions.md standards
- Multi-tenant isolation (always use tenantId)
- Tests required (>80% coverage)
- Update documentation
- Focus: $FOCUS

## Output Format (from subagents-config.md)
1. Implementation code
2. Tests (unit + integration)
3. Release notes
4. Documentation updates

Implement task TNT-$TASK_ID.
EOF
)
        ;;
    *)
        echo "Unknown model: $MODEL"
        exit 1
        ;;
esac

echo "$PROMPT" | tee /tmp/ai-prompt-$TASK_ID.txt
echo ""
echo "✅ Prompt saved to /tmp/ai-prompt-$TASK_ID.txt"
echo "📋 Copy the prompt above and paste it into $MODEL"


