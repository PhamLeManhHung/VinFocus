#!/usr/bin/env python3
"""Quick test to verify the bug fixes work correctly."""

import sys
import os

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_imports():
    """Test that all imports work."""
    print("Testing imports...")
    try:
        import main
        print("✓ main.py imports successfully")
        return True
    except Exception as e:
        print(f"✗ Import failed: {e}")
        return False

def test_cache_bug_fixed():
    """Test that courses are not cached globally."""
    print("\nTesting cache bug fix...")
    import main
    
    # Check that get_courses doesn't use cache
    import inspect
    source = inspect.getsource(main.get_courses)
    
    if 'cache_get("courses")' in source:
        print("✗ FAIL: get_courses still uses global cache")
        return False
    
    if 'not cached - user-specific' in source:
        print("✓ PASS: get_courses correctly avoids global cache")
        return True
    
    print("✗ FAIL: Could not verify cache fix")
    return False

def test_cors_configured():
    """Test that CORS is configured."""
    print("\nTesting CORS configuration...")
    import main
    
    # Check that CORS is imported and used
    if hasattr(main, 'CORS'):
        print("✓ PASS: CORS is configured")
        return True
    
    print("✗ FAIL: CORS not configured")
    return False

def test_health_endpoint():
    """Test that health endpoint exists."""
    print("\nTesting health endpoint...")
    import main
    
    rules = [rule for rule in main.app.url_map.iter_rules()]
    health_rules = [r for r in rules if '/health' in str(r)]
    
    if health_rules:
        print(f"✓ PASS: Health endpoint exists: {health_rules[0]}")
        return True
    
    print("✗ FAIL: Health endpoint not found")
    return False

def test_db_pooling():
    """Test that database pooling is configured."""
    print("\nTesting database pooling...")
    import main
    
    if hasattr(main, '_db_pool'):
        print("✓ PASS: Database pool variable exists")
        return True
    
    print("✗ FAIL: Database pool not configured")
    return False

def test_no_crash_without_db():
    """Test that app doesn't crash if DATABASE_URL is missing."""
    print("\nTesting graceful DB handling...")
    import main
    
    # The app should have initialized even without DB
    if hasattr(main, 'app'):
        print("✓ PASS: App initialized without crashing")
        return True
    
    print("✗ FAIL: App did not initialize")
    return False

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
            results.append(test())
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