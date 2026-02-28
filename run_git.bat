@echo off
git status > git_out.txt 2>&1
git remote -v >> git_out.txt 2>&1
