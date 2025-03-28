#!/usr/bin/env bash

function _db_migrate() {

  local \
    curr \
    prev \
    opts \
    ;

  COMPREPLY=()

  curr="${COMP_WORDS[COMP_CWORD]}"
  prev="${COMP_WORDS[COMP_CWORD - 1]}"
  opts="generate up down latest rollback list unlock version build"

  case "${prev}" in
    up | down)
      opts="--select --codegen"
      ;;
    latest)
      opts="--codegen"
      ;;
    rollback)
      opts="--all --codegen"
      ;;
    build)
      opts="--dir"
      ;;
    -d | --dir)
      opts="$(find -mindepth 1 -maxdepth 1 -type d -printf '%f ')"
      ;;
    *) ;;
  esac

  COMPREPLY=($(compgen -W "$opts" -- $curr))
  return 0

}

complete -F _db_migrate db-migrate
