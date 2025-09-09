# CI/CD Recovery Guide: Firebase Hosting Deployment

## Overview
This document outlines the challenges faced during CI/CD setup for a Firebase Hosting deployment and the recovery steps taken to resolve them.

## Project Structure
```
hackathon-project-2025/
├── firebase-backend/
│   ├── firebase.json
│   ├── package.json
│   └── functions/
└── frontend-tourplanner/
    ├── package.json
    ├── next.config.ts
    └── src/
```

## Challenges Faced

### 1. Initial Workflow Location Issue
**Problem**: GitHub Actions workflow files were placed in `firebase-backend/.github/workflows/` instead of the root `.github/workflows/` directory.

**Error**: GitHub Actions couldn't find the workflow files and was using old configurations from previous commits.

**Solution**: 
- Moved workflow files to root `.github/workflows/` directory
- Committed and pushed the changes

### 2. Package Lock File Synchronization
**Problem**: `package-lock.json` files were out of sync with `package.json` files in both `firebase-backend/` and `frontend-tourplanner/` directories.

**Error**: 
```
npm error `npm ci` can only install packages when your package.json and package-lock.json are in sync
```

**Solution**:
- Ran `npm install` in both directories to regenerate lock files
- Committed the updated `package-lock.json` files

### 3. Firebase Entry Point Configuration
**Problem**: Firebase deployment action couldn't find `firebase.json` because it was looking in the root directory.

**Error**: 
```
Error: firebase.json file not found. If your firebase.json file is not in the root of your repo, edit the entryPoint option
```

**Solution**: Added `entryPoint: ./firebase-backend` to the Firebase GitHub Action configuration.

### 4. Incorrect Build Directory
**Problem**: `.next` folder was being created in `firebase-backend/` instead of `frontend-tourplanner/`.

**Error**: Firebase couldn't detect the web framework properly.

**Solution**: 
- Ensured build process runs in `frontend-tourplanner/` directory
- Used Firebase GitHub Action instead of direct CLI commands
- Configured proper `entryPoint` to point to Firebase configuration

### 5. Persistent Package Lock Issues
**Problem**: Even after fixing locally, GitHub Actions continued to fail with package lock sync errors.

**Error**: Multiple missing dependencies in lock file.

**Solution**: Removed the `node_modules` and `package-lock.json()` file from the UI using `rm -rf` and then resintalled using '`npm install` to sync all files.

## Recovery Steps

### Step 1: Reset to Working Commit
```bash
git reset --hard bd46286
git push --force origin main
```

### Step 2: Move Workflow Files to Correct Location
```bash
mkdir -p .github/workflows
cp firebase-backend/.github/workflows/*.yml .github/workflows/
rm -rf firebase-backend/.github
```

### Step 3: Fix Package Lock Files
```bash
# In firebase-backend directory
cd firebase-backend
npm install
cd ..

# In frontend-tourplanner directory  
cd frontend-tourplanner
npm install
cd ..
```

### Step 4: Update Workflow Configuration
Updated both workflow files to:
- Use `npm install` instead of `npm ci`
- Build frontend in correct directory
- Use Firebase GitHub Action with proper `entryPoint`

### Step 5: Commit and Push Changes
```bash
git add .
git commit -m "Fix CI/CD workflow configuration"
git push origin main
```

## Final Working Configuration

### Workflow Structure
```yaml
name: Deploy to Firebase Hosting on merge
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: 'frontend-tourplanner/package-lock.json'
      - name: Install and build frontend
        run: |
          cd frontend-tourplanner
          npm install
          npm run build
      - name: Deploy to Firebase Hosting
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: ${{ secrets.GITHUB_TOKEN }}
          firebaseServiceAccount: ${{ secrets.FIREBASE_SERVICE_ACCOUNT_HACKATHON_COMPETITION_2025 }}
          channelId: live
          projectId: hackathon-competition-2025
          entryPoint: ./firebase-backend
```

### Firebase Configuration
```json
{
  "hosting": {
    "target": "default",
    "source": "../frontend-tourplanner",
    "frameworksBackend": {}
  }
}
```

## Key Learnings

1. **Workflow Location**: GitHub Actions workflows must be in `.github/workflows/` at the repository root
2. **Package Lock Sync**: Always ensure `package-lock.json` is in sync with `package.json`
3. **Firebase Entry Point**: Use `entryPoint` option when Firebase config is in a subdirectory
4. **Build Process**: Ensure build happens in the correct directory before deployment
5. **CI vs Install**: Use `npm install` instead of `npm ci` when lock files might be out of sync

## Prevention Tips

1. Always test workflows locally before pushing
2. Keep package lock files in sync with package.json
3. Use proper directory structure for monorepos
4. Document workflow configurations
5. Use consistent Node.js versions across environments

## Troubleshooting Commands

```bash
# Check workflow files location
ls -la .github/workflows/

# Verify package lock sync
cd frontend-tourplanner && npm ci

# Check Firebase configuration
cd firebase-backend && firebase projects:list

# Test build process
cd frontend-tourplanner && npm run build
```
