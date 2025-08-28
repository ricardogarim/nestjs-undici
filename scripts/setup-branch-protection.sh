#!/bin/bash

# Setup Branch Protection Rules using GitHub CLI
# Requires: gh cli authenticated with repo admin permissions
# Usage: ./scripts/setup-branch-protection.sh

REPO="ricardogarim/nestjs-undici"

echo "Setting up branch protection for main branch..."

# Main branch protection
gh api \
  --method PUT \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  /repos/$REPO/branches/main/protection \
  -f "required_status_checks[strict]=true" \
  -f "required_status_checks[contexts][]=test (18.x)" \
  -f "required_status_checks[contexts][]=test (20.x)" \
  -f "required_status_checks[contexts][]=test (22.x)" \
  -f "required_status_checks[contexts][]=changesets" \
  -f "enforce_admins=false" \
  -f "required_pull_request_reviews[required_approving_review_count]=1" \
  -f "required_pull_request_reviews[dismiss_stale_reviews]=true" \
  -f "required_pull_request_reviews[require_code_owner_reviews]=true" \
  -f "required_pull_request_reviews[require_last_push_approval]=false" \
  -f "restrictions=null" \
  -f "allow_force_pushes=false" \
  -f "allow_deletions=false" \
  -f "required_conversation_resolution=true" \
  -f "lock_branch=false" \
  -f "allow_fork_syncing=true"

echo "Branch protection set for main!"

# Enable auto-merge
gh api \
  --method PATCH \
  -H "Accept: application/vnd.github+json" \
  /repos/$REPO \
  -f "allow_auto_merge=true" \
  -f "delete_branch_on_merge=true"

echo "Auto-merge enabled!"

# Create labels
echo "Creating labels..."

# Function to create label
create_label() {
  gh label create "$1" --color "$2" --description "$3" 2>/dev/null || \
  gh label edit "$1" --color "$2" --description "$3"
}

create_label "bug" "d73a4a" "Something isn't working"
create_label "enhancement" "a2eeef" "New feature or request"
create_label "documentation" "0075ca" "Documentation improvements"
create_label "dependencies" "0366d6" "Dependency updates"
create_label "ci" "000000" "Continuous Integration"
create_label "automated" "808080" "Automated PR from bots"
create_label "breaking" "ff0000" "Breaking change"
create_label "security" "ffa500" "Security issue or fix"
create_label "performance" "ffff00" "Performance improvement"
create_label "help wanted" "008672" "Extra attention needed"
create_label "good first issue" "7057ff" "Good for newcomers"

echo "Setup complete!"