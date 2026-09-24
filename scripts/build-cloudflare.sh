#!/usr/bin/env bash

set -euo pipefail

project_dir="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)"
requested_output="${1:-cloudflare-upload}"

if [[ "$requested_output" = /* ]]; then
  output_candidate="$requested_output"
else
  output_candidate="$project_dir/$requested_output"
fi

output_parent="$(dirname -- "$output_candidate")"
output_name="$(basename -- "$output_candidate")"
mkdir -p -- "$output_parent"
output_parent="$(CDPATH= cd -- "$output_parent" && pwd -P)"
output_dir="$output_parent/$output_name"

# This script replaces its output on every run, so constrain that operation to
# a child directory of this repository and never allow the repository itself.
case "$output_dir" in
  "$project_dir"/*) ;;
  *)
    printf 'Error: output directory must be inside %s\n' "$project_dir" >&2
    exit 1
    ;;
esac

if [[ "$output_dir" == "$project_dir" || "$output_name" == '.' || "$output_name" == '..' ]]; then
  printf 'Error: refusing unsafe output directory: %s\n' "$output_dir" >&2
  exit 1
fi

if [[ ! -d "$project_dir/node_modules" ]]; then
  printf 'Error: dependencies are missing. Run npm ci first.\n' >&2
  exit 1
fi

cd -- "$project_dir"
printf 'Running release checks and creating the production build...\n'
npm run check

if [[ ! -f "$project_dir/dist/index.html" || ! -f "$project_dir/dist/_headers" ]]; then
  printf 'Error: the production build is missing index.html or _headers.\n' >&2
  exit 1
fi

staging_dir="$(mktemp -d "$output_parent/.${output_name}.staging.XXXXXX")"
cleanup() {
  if [[ -d "$staging_dir" ]]; then
    rm -rf -- "$staging_dir"
  fi
}
trap cleanup EXIT

cp -a -- "$project_dir/dist/." "$staging_dir/"

# Replace only the validated project-local destination after staging succeeds.
rm -rf -- "$output_dir"
mv -- "$staging_dir" "$output_dir"
trap - EXIT

file_count="$(find "$output_dir" -type f | wc -l | tr -d ' ')"
printf '\nCloudflare upload directory ready:\n  %s\n  %s files\n' "$output_dir" "$file_count"
printf '\nUpload this directory in Cloudflare, or deploy the repository with: npx wrangler deploy\n'
