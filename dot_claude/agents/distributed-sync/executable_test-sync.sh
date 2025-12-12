#!/bin/bash

# Distributed Sync Testing Script
# Tests bidirectional sync, conflict resolution, and session handoff

set -euo pipefail

# Configuration
TEST_DIR="$HOME/.claude/agents/distributed-sync/test"
SYNC_MANAGER="$HOME/.claude/agents/distributed-sync/sync-manager-v2.sh"
LAUNCHER="$HOME/.claude/agents/distributed-sync/universal-launcher.sh"
REMOTE_HOST="mac00"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Test results
TESTS_PASSED=0
TESTS_FAILED=0

# Test framework
run_test() {
    local test_name=$1
    local test_func=$2

    echo -e "\n${BLUE}Running:${NC} $test_name"

    if $test_func; then
        echo -e "${GREEN}✓ PASSED${NC}: $test_name"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ FAILED${NC}: $test_name"
        ((TESTS_FAILED++))
    fi
}

# Setup test environment
setup_test_env() {
    echo -e "${CYAN}Setting up test environment...${NC}"

    # Create test directories
    mkdir -p "$TEST_DIR"/{local,remote}

    # Initialize sync manager
    "$SYNC_MANAGER" init

    # Initialize launcher
    "$LAUNCHER" init

    echo -e "${GREEN}✓${NC} Test environment ready"
}

# Test 1: Basic file sync
test_basic_sync() {
    local test_file="$HOME/CloudRaider/test_sync_$(date +%s).txt"
    local test_content="Test sync at $(date)"

    # Create test file locally
    echo "$test_content" > "$test_file"

    # Start sync
    "$SYNC_MANAGER" push

    # Verify on remote
    local remote_content=$(ssh "$REMOTE_HOST" "cat '$test_file' 2>/dev/null" || echo "NOT_FOUND")

    # Cleanup
    rm -f "$test_file"
    ssh "$REMOTE_HOST" "rm -f '$test_file'" 2>/dev/null || true

    [[ "$remote_content" == "$test_content" ]]
}

# Test 2: Real-time sync
test_realtime_sync() {
    # Start real-time sync
    "$SYNC_MANAGER" start > /dev/null 2>&1

    # Wait for watchers to initialize
    sleep 3

    # Create test file
    local test_file="$HOME/CloudRaider/realtime_test_$(date +%s).txt"
    echo "Initial content" > "$test_file"

    # Wait for sync
    sleep 2

    # Modify file
    echo "Modified content" >> "$test_file"

    # Wait for sync
    sleep 2

    # Check remote
    local remote_content=$(ssh "$REMOTE_HOST" "cat '$test_file' 2>/dev/null" || echo "NOT_FOUND")

    # Stop real-time sync
    "$SYNC_MANAGER" stop > /dev/null 2>&1

    # Cleanup
    rm -f "$test_file"
    ssh "$REMOTE_HOST" "rm -f '$test_file'" 2>/dev/null || true

    [[ "$remote_content" == *"Modified content"* ]]
}

# Test 3: Bidirectional sync
test_bidirectional() {
    local local_file="$HOME/CloudRaider/local_$(date +%s).txt"
    local remote_file="$HOME/CloudRaider/remote_$(date +%s).txt"

    # Create file locally
    echo "Local file content" > "$local_file"

    # Create file on remote
    ssh "$REMOTE_HOST" "echo 'Remote file content' > '$remote_file'"

    # Run bidirectional sync
    "$SYNC_MANAGER" sync > /dev/null 2>&1

    # Check if local got remote file
    local got_remote_file=false
    if [[ -f "$remote_file" ]]; then
        got_remote_file=true
    fi

    # Check if remote got local file
    local remote_has_local=false
    if ssh "$REMOTE_HOST" "test -f '$local_file'" 2>/dev/null; then
        remote_has_local=true
    fi

    # Cleanup
    rm -f "$local_file" "$remote_file"
    ssh "$REMOTE_HOST" "rm -f '$local_file' '$remote_file'" 2>/dev/null || true

    [[ "$got_remote_file" == "true" ]] && [[ "$remote_has_local" == "true" ]]
}

# Test 4: Conflict detection
test_conflict_detection() {
    local test_file="$HOME/CloudRaider/conflict_test.txt"
    local conflict_log="$HOME/.claude/agents/distributed-sync/conflicts.log"

    # Create same file on both sides with different content
    echo "Local version" > "$test_file"
    ssh "$REMOTE_HOST" "echo 'Remote version' > '$test_file'"

    # Clear conflict log
    > "$conflict_log"

    # Run bidirectional sync
    "$SYNC_MANAGER" sync > /dev/null 2>&1

    # Check if conflict was detected
    local conflict_detected=false
    if grep -q "conflict_test.txt" "$conflict_log" 2>/dev/null; then
        conflict_detected=true
    fi

    # Check if both versions were preserved
    local preserved=false
    if ls "$test_file".*.* 2>/dev/null | grep -q .; then
        preserved=true
    fi

    # Cleanup
    rm -f "$test_file" "$test_file".*.*
    ssh "$REMOTE_HOST" "rm -f '$test_file' '$test_file'.*.*" 2>/dev/null || true

    [[ "$conflict_detected" == "true" ]] || [[ "$preserved" == "true" ]]
}

# Test 5: Git repository sync
test_git_sync() {
    local test_repo="$HOME/CloudRaider/test_repo_$(date +%s)"

    # Create test git repo
    mkdir -p "$test_repo"
    cd "$test_repo"
    git init > /dev/null 2>&1
    echo "Test file" > README.md
    git add README.md
    git commit -m "Initial commit" > /dev/null 2>&1
    cd - > /dev/null

    # Sync git repos
    "$SYNC_MANAGER" git > /dev/null 2>&1

    # Check if repo exists on remote
    local remote_has_repo=false
    if ssh "$REMOTE_HOST" "test -d '$test_repo/.git'" 2>/dev/null; then
        remote_has_repo=true
    fi

    # Check git log on remote
    local remote_commits=$(ssh "$REMOTE_HOST" "cd '$test_repo' && git log --oneline 2>/dev/null | wc -l" || echo "0")

    # Cleanup
    rm -rf "$test_repo"
    ssh "$REMOTE_HOST" "rm -rf '$test_repo'" 2>/dev/null || true

    [[ "$remote_has_repo" == "true" ]] && [[ "$remote_commits" -ge 1 ]]
}

# Test 6: Session handoff
test_session_handoff() {
    local test_dir="$HOME/CloudRaider/session_test_$(date +%s)"

    # Create test directory and navigate to it
    mkdir -p "$test_dir"
    cd "$test_dir"

    # Save session
    "$SYNC_MANAGER" handoff save > /dev/null 2>&1

    # Check if session was saved
    local session_saved=false
    if [[ -f "$HOME/.claude/agents/distributed-sync/session.cwd" ]]; then
        local saved_cwd=$(cat "$HOME/.claude/agents/distributed-sync/session.cwd")
        if [[ "$saved_cwd" == "$test_dir" ]]; then
            session_saved=true
        fi
    fi

    # Check if session synced to remote
    local remote_has_session=false
    if ssh "$REMOTE_HOST" "test -f '$HOME/.claude/agents/distributed-sync/session.cwd'" 2>/dev/null; then
        remote_has_session=true
    fi

    # Cleanup
    cd "$HOME"
    rm -rf "$test_dir"
    ssh "$REMOTE_HOST" "rm -rf '$test_dir'" 2>/dev/null || true

    [[ "$session_saved" == "true" ]] && [[ "$remote_has_session" == "true" ]]
}

# Test 7: Project launcher
test_project_launcher() {
    local test_project="test_project_$(date +%s)"
    local test_path="$HOME/CloudRaider/$test_project"

    # Create test project
    mkdir -p "$test_path"
    echo "print('Test project')" > "$test_path/main.py"
    echo "requests==2.28.0" > "$test_path/requirements.txt"

    # Register project
    "$LAUNCHER" register "$test_project" "$test_path" "python" > /dev/null 2>&1

    # Check if project was registered
    local registered=false
    if "$LAUNCHER" list 2>/dev/null | grep -q "$test_project"; then
        registered=true
    fi

    # Cleanup
    rm -rf "$test_path"

    [[ "$registered" == "true" ]]
}

# Test 8: Auto-discovery
test_auto_discovery() {
    local test_project="discovery_test_$(date +%s)"
    local test_path="$HOME/CloudRaider/$test_project"

    # Create test projects
    mkdir -p "$test_path"
    cat > "$test_path/package.json" <<EOF
{
  "name": "$test_project",
  "version": "1.0.0"
}
EOF

    # Run discovery
    "$LAUNCHER" discover > /dev/null 2>&1

    # Check if project was discovered
    local discovered=false
    if "$LAUNCHER" list 2>/dev/null | grep -q "$test_project"; then
        discovered=true
    fi

    # Cleanup
    rm -rf "$test_path"

    [[ "$discovered" == "true" ]]
}

# Test 9: Environment sync
test_environment_sync() {
    # Set test environment variable
    export TEST_SYNC_VAR="test_value_$(date +%s)"

    # Sync environment
    "$SYNC_MANAGER" env > /dev/null 2>&1

    # Check if env was synced to remote
    local remote_has_env=false
    if ssh "$REMOTE_HOST" "grep -q 'TEST_SYNC_VAR' '$HOME/.claude/agents/distributed-sync/env.remote'" 2>/dev/null; then
        remote_has_env=true
    fi

    # Cleanup
    unset TEST_SYNC_VAR

    [[ "$remote_has_env" == "true" ]]
}

# Test 10: Performance test
test_performance() {
    local test_files=100
    local test_dir="$HOME/CloudRaider/perf_test_$(date +%s)"

    mkdir -p "$test_dir"

    # Create many small files
    echo -e "${YELLOW}Creating $test_files test files...${NC}"
    for i in $(seq 1 $test_files); do
        echo "Test content $i" > "$test_dir/file_$i.txt"
    done

    # Measure sync time
    local start_time=$(date +%s)
    "$SYNC_MANAGER" push > /dev/null 2>&1
    local end_time=$(date +%s)
    local sync_time=$((end_time - start_time))

    echo -e "${CYAN}Sync time for $test_files files: ${sync_time}s${NC}"

    # Verify files on remote
    local remote_count=$(ssh "$REMOTE_HOST" "ls '$test_dir' 2>/dev/null | wc -l" || echo "0")

    # Cleanup
    rm -rf "$test_dir"
    ssh "$REMOTE_HOST" "rm -rf '$test_dir'" 2>/dev/null || true

    # Pass if all files synced and time is reasonable (< 30s for 100 files)
    [[ "$remote_count" -eq "$test_files" ]] && [[ "$sync_time" -lt 30 ]]
}

# Integration test
test_integration() {
    echo -e "\n${CYAN}═══════════════════════════════════════════${NC}"
    echo -e "${CYAN}    Running Full Integration Test${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════${NC}"

    # 1. Create a project locally
    local project_name="integration_test_$(date +%s)"
    local project_path="$HOME/CloudRaider/$project_name"

    echo -e "\n${BLUE}1. Creating project locally...${NC}"
    mkdir -p "$project_path"
    cat > "$project_path/app.py" <<EOF
#!/usr/bin/env python3
print("Integration test application")
EOF
    chmod +x "$project_path/app.py"

    # 2. Start real-time sync
    echo -e "${BLUE}2. Starting real-time sync...${NC}"
    "$SYNC_MANAGER" start > /dev/null 2>&1
    sleep 3

    # 3. Verify sync to remote
    echo -e "${BLUE}3. Verifying sync to remote...${NC}"
    if ssh "$REMOTE_HOST" "test -f '$project_path/app.py'" 2>/dev/null; then
        echo -e "  ${GREEN}✓${NC} File synced to remote"
    else
        echo -e "  ${RED}✗${NC} File not found on remote"
        return 1
    fi

    # 4. Make changes on remote
    echo -e "${BLUE}4. Making changes on remote...${NC}"
    ssh "$REMOTE_HOST" "echo 'print(\"Modified on remote\")' >> '$project_path/app.py'"

    # 5. Pull changes back
    echo -e "${BLUE}5. Pulling changes back...${NC}"
    "$SYNC_MANAGER" sync > /dev/null 2>&1
    sleep 2

    # 6. Verify changes locally
    echo -e "${BLUE}6. Verifying changes locally...${NC}"
    if grep -q "Modified on remote" "$project_path/app.py" 2>/dev/null; then
        echo -e "  ${GREEN}✓${NC} Remote changes pulled successfully"
    else
        echo -e "  ${RED}✗${NC} Remote changes not found locally"
        return 1
    fi

    # 7. Register and launch project
    echo -e "${BLUE}7. Registering project...${NC}"
    "$LAUNCHER" register "$project_name" "$project_path" "python" > /dev/null 2>&1

    # 8. Test session handoff
    echo -e "${BLUE}8. Testing session handoff...${NC}"
    cd "$project_path"
    "$SYNC_MANAGER" handoff save > /dev/null 2>&1

    # 9. Stop sync
    echo -e "${BLUE}9. Stopping sync...${NC}"
    "$SYNC_MANAGER" stop > /dev/null 2>&1

    # Cleanup
    cd "$HOME"
    rm -rf "$project_path"
    ssh "$REMOTE_HOST" "rm -rf '$project_path'" 2>/dev/null || true

    echo -e "${GREEN}✓${NC} Integration test completed successfully"
    return 0
}

# Main test runner
main() {
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║        ${YELLOW}Distributed Sync Test Suite${CYAN}                       ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"

    # Setup
    setup_test_env

    # Run tests
    run_test "Basic File Sync" test_basic_sync
    run_test "Real-time Sync" test_realtime_sync
    run_test "Bidirectional Sync" test_bidirectional
    run_test "Conflict Detection" test_conflict_detection
    run_test "Git Repository Sync" test_git_sync
    run_test "Session Handoff" test_session_handoff
    run_test "Project Launcher" test_project_launcher
    run_test "Auto-discovery" test_auto_discovery
    run_test "Environment Sync" test_environment_sync
    run_test "Performance Test" test_performance

    # Run integration test
    run_test "Full Integration" test_integration

    # Summary
    echo -e "\n${CYAN}═══════════════════════════════════════════${NC}"
    echo -e "${CYAN}              Test Summary${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════${NC}"
    echo -e "${GREEN}Passed:${NC} $TESTS_PASSED"
    echo -e "${RED}Failed:${NC} $TESTS_FAILED"

    if [[ $TESTS_FAILED -eq 0 ]]; then
        echo -e "\n${GREEN}✓ All tests passed!${NC}"
        echo -e "${YELLOW}The distributed sync system is working correctly.${NC}"
        exit 0
    else
        echo -e "\n${RED}✗ Some tests failed${NC}"
        exit 1
    fi
}

# Run tests
main "$@"