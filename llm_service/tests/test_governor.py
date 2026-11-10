from app.capacity.governor import CapacityGovernor, Level


class FakeClock:
    def __init__(self):
        self.t = 1000.0

    def __call__(self):
        return self.t


def test_levels_follow_quota_ratio():
    g = CapacityGovernor(FakeClock())
    assert g.level is Level.FULL
    g.observe_quota(4, 10)
    assert g.level is Level.LEAN
    g.observe_quota(1, 10)
    assert g.level is Level.ECO
    g.observe_quota(9, 10)
    assert g.level is Level.FULL


def test_two_saturations_in_a_minute_force_eco_then_expire():
    clock = FakeClock()
    g = CapacityGovernor(clock)
    g.observe_saturation()
    g.observe_saturation()
    assert g.level is Level.ECO
    clock.t += 61
    assert g.level is Level.FULL


def test_exhaustion_is_offline_until_delay_passes():
    clock = FakeClock()
    g = CapacityGovernor(clock)
    g.observe_exhausted(30)
    assert g.level is Level.OFFLINE
    clock.t += 31
    assert g.level is Level.ECO  # ratio stays 0 until a fresh header arrives
    g.observe_quota(10, 10)
    assert g.level is Level.FULL
