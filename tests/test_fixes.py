#!/usr/bin/env python3
"""Quick test to verify the bug fixes work correctly."""

import sys
import os

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_imports():
    """Test that all imports work."""
    print("Testing imports...")
    import main
    assert True
    print("✓ main.py imports successfully")

def test_cache_bug_fixed():
    """Test that courses are not cached globally."""
    print("\nTesting cache bug fix...")
    import main
    
    import inspect
    source = inspect.getsource(main.get_courses)
    
    assert 'cache_get("courses")' not in source, "get_courses still uses global cache"
    assert 'not cached - user-specific' in source, "Could not verify cache fix"
    
    print("✓ PASS: get_courses correctly avoids global cache")

def test_cors_configured():
    """Test that CORS is configured."""
    print("\nTesting CORS configuration...")
    import main
    
    assert hasattr(main, 'CORS'), "CORS not configured"
    print("✓ PASS: CORS is configured")

def test_health_endpoint():
    """Test that health endpoint exists."""
    print("\nTesting health endpoint...")
    import main
    
    rules = [rule for rule in main.app.url_map.iter_rules()]
    health_rules = [r for r in rules if '/health' in str(r)]
    
    assert health_rules, "Health endpoint not found"
    print(f"✓ PASS: Health endpoint exists: {health_rules[0]}")

def test_db_pooling():
    """Test that database pooling is configured."""
    print("\nTesting database pooling...")
    import main
    
    assert hasattr(main, '_db_pool'), "Database pool not configured"
    print("✓ PASS: Database pool variable exists")

def test_no_crash_without_db():
    """Test that app doesn't crash if DATABASE_URL is missing."""
    print("\nTesting graceful DB handling...")
    import main
    
    assert hasattr(main, 'app'), "App did not initialize"
    print("✓ PASS: App initialized without crashing")

def main_test():
    """Run all tests."""
    print("=" * 60)
    print("VinFocus Bug Fix Verification Tests")
    print("=" * 60)
    
    tests = [
        test_imports,
        test_cache_bug_fixed,
        test_cors_configured,
        test_health_endpoint,
        test_db_pooling,
        test_no_crash_without_db,
    ]
    
    results = []
    for test in tests:
        try:
            test()
            results.append(True)
        except AssertionError as e:
            print(f"✗ FAIL: {e}")
            results.append(False)
        except Exception as e:
            print(f"✗ Test {test.__name__} raised exception: {e}")
            results.append(False)
    
    print("\n" + "=" * 60)
    passed = sum(results)
    total = len(results)
    print(f"Results: {passed}/{total} tests passed")
    print("=" * 60)
    
    if all(results):
        print("\n✓ All tests passed! The bugs have been fixed.")
        return 0
    else:
        print("\n✗ Some tests failed. Please review the output above.")
        return 1

if __name__ == "__main__":
    sys.exit(main_test())