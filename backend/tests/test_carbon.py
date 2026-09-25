"""Comprehensive tests for Blue Carbon estimation, pools, change, uncertainty, and API endpoints (Phase 6)."""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.carbon.factors import (
    CARBON_FACTORS,
    CO2_TO_C_RATIO,
    get_factor,
    get_all_factors,
    validate_carbon_factor,
)
from app.carbon.pools import (
    POOL_AGB,
    POOL_BGB,
    POOL_SOC,
    POOL_LITTER,
    calculate_stratified_pools,
)
from app.carbon.estimation import (
    calculate_carbon_stock,
    calculate_carbon_change,
)
from app.carbon.uncertainty import calculate_propagated_uncertainty
from app.carbon.valuation import calculate_indicative_valuation
from app.carbon.methodology import get_methodology_report

client = TestClient(app)


# =====================================================================
# 1. FACTOR REGISTRY & PROVENANCE TESTS
# =====================================================================

def test_factor_registry_integrity():
    """Verify that all factors have required provenance fields and valid units."""
    factors = get_all_factors()
    assert len(factors) >= 4

    for f in factors:
        assert "factorId" in f
        assert "value" in f
        assert f["value"] > 0
        assert "unit" in f
        assert "source" in f
        assert "tier" in f
        assert "geographicScope" in f
        assert f["verified"] is True
        validate_carbon_factor(f["value"], f["unit"])

    with pytest.raises(ValueError, match="non-negative"):
        validate_carbon_factor(-5.0, "Mg C / ha")

    with pytest.raises(ValueError, match="Invalid carbon factor unit"):
        validate_carbon_factor(10.0, "invalid_unit")


# =====================================================================
# 2. POOL STRATIFICATION & MOLECULAR CONVERSION TESTS
# =====================================================================

def test_pool_stratification_and_co2e():
    """Verify pool calculations, sum of pools, and CO2e conversion (44/12)."""
    area_ha = 100.0  # 100 hectares
    res = calculate_stratified_pools(area_ha)

    assert res["mangroveAreaHa"] == 100.0
    assert POOL_AGB in res["pools"]
    assert POOL_BGB in res["pools"]
    assert POOL_SOC in res["pools"]

    agb_val = res["pools"][POOL_AGB]["carbon_mg_c"]
    bgb_val = res["pools"][POOL_BGB]["carbon_mg_c"]
    soc_val = res["pools"][POOL_SOC]["carbon_mg_c"]

    # Sum of pools must equal total
    assert pytest.approx(res["totalCarbonMgC"], rel=1e-3) == (agb_val + bgb_val + soc_val)

    # CO2e must equal Carbon * 44/12
    expected_co2e = round(res["totalCarbonMgC"] * (44.0 / 12.0), 2)
    assert res["totalCo2eMg"] == expected_co2e

    # Percentage sum should equal 100%
    pct_sum = sum(p["percentage_of_total"] for p in res["pools"].values())
    assert pytest.approx(pct_sum, rel=1e-1) == 100.0


def test_zero_and_negative_area_handling():
    """Verify safety when mangrove area is zero or negative."""
    res_zero = calculate_stratified_pools(0.0)
    assert res_zero["totalCarbonMgC"] == 0.0
    assert res_zero["totalCo2eMg"] == 0.0

    with pytest.raises(ValueError, match="cannot be negative"):
        calculate_stratified_pools(-10.0)


# =====================================================================
# 3. MULTI-TEMPORAL CARBON CHANGE TESTS (2020 vs 2025)
# =====================================================================

def test_multi_temporal_carbon_stock_change():
    """Verify 2020 vs 2025 stock change, gross loss/gain attribution, and annualized indicators."""
    base_ha = 750.6
    comp_ha = 775.6
    loss_ha = 9.6
    gain_ha = 34.6  # Net change = +25.0 ha

    ch = calculate_carbon_change(
        baseline_mangrove_ha=base_ha,
        comparison_mangrove_ha=comp_ha,
        gross_loss_ha=loss_ha,
        gross_gain_ha=gain_ha,
        from_year=2020,
        to_year=2025,
    )

    assert ch["fromYear"] == 2020
    assert ch["toYear"] == 2025
    assert ch["numberOfYears"] == 5

    # Net carbon change = Stock(2025) - Stock(2020)
    expected_change = ch["carbonStock2025MgC"] - ch["carbonStock2020MgC"]
    assert pytest.approx(ch["carbonStockChangeMgC"], rel=1e-2) == expected_change

    # Net change should also match (Gross Gain - Gross Loss)
    net_from_transitions = ch["grossCarbonGainMgC"] - ch["grossCarbonLossMgC"]
    assert pytest.approx(ch["carbonStockChangeMgC"], rel=1e-2) == net_from_transitions

    # Annualized change = Total / 5
    assert pytest.approx(ch["annualizedStockChangeMgC"], rel=1e-2) == (ch["carbonStockChangeMgC"] / 5.0)

    # CO2e change = Carbon change * 44/12
    assert pytest.approx(ch["co2eChangeMgCO2e"], rel=1e-2) == (ch["carbonStockChangeMgC"] * (44.0 / 12.0))


# =====================================================================
# 4. UNCERTAINTY PROPAGATION TESTS
# =====================================================================

def test_first_order_uncertainty_propagation():
    """Verify error propagation formula: rel = sqrt(rel_area^2 + rel_factor^2)."""
    carbon_stock = 10000.0  # 10,000 Mg C
    unc = calculate_propagated_uncertainty(
        carbon_stock_mg_c=carbon_stock,
        area_uncertainty_pct=3.0,
        factor_uncertainty_pct=18.0,
    )

    # Combined relative = sqrt(0.03^2 + 0.18^2) ≈ 0.18248 (18.2%)
    assert 18.0 <= unc["combinedRelativeUncertaintyPct"] <= 18.5
    assert unc["lowerBoundMgC"] < carbon_stock < unc["upperBoundMgC"]
    assert unc["marginOfErrorMgC"] > 0
    assert unc["status"] == "partial"


# =====================================================================
# 5. INDICATIVE VALUATION & METHODOLOGY REPORT TESTS
# =====================================================================

def test_indicative_economic_valuation():
    """Verify valuation math and disclaimer presence."""
    val = calculate_indicative_valuation(co2e_metric_tons=1000.0, reference_price_usd=12.0)
    assert val["status"] == "indicative"
    assert val["indicative_value"] == 12000.0
    assert "disclaimer" in val
    assert "financial revenue" in val["disclaimer"]


def test_methodology_report_completeness():
    """Verify methodology report contains required IPCC & Blue Carbon references."""
    report = get_methodology_report()
    assert report["methodologyTier"] == "Tier 1 / indicative"
    assert len(report["primaryReferences"]) >= 2
    assert len(report["carbonPools"]) >= 3
    assert len(report["assumptions"]) >= 3
    assert "carbonCreditDisclaimer" in report


# =====================================================================
# 6. FASTAPI ROUTE INTEGRATION TESTS
# =====================================================================

def test_api_carbon_main_endpoint():
    """Verify GET /api/carbon response schema and data."""
    res = client.get("/api/carbon?village_id=gosaba&year=2025")
    assert res.status_code == 200
    data = res.json()

    assert data["villageId"] == "gosaba"
    assert data["year"] == 2025
    assert data["totalCarbonTons"] > 0
    assert "carbonStockMgC" in data
    assert "co2eEquivalentMg" in data
    assert "pools" in data
    assert "uncertainty" in data
    assert "valuation" in data
    assert data["isIndicative"] is True


def test_api_carbon_pools_endpoint():
    """Verify GET /api/carbon/pools response."""
    res = client.get("/api/carbon/pools?village_id=gosaba&year=2025")
    assert res.status_code == 200
    data = res.json()

    assert data["villageId"] == "gosaba"
    assert "pools" in data
    assert "aboveground_biomass" in data["pools"]
    assert "soil_organic_carbon" in data["pools"]


def test_api_carbon_methodology_endpoint():
    """Verify GET /api/carbon/methodology response."""
    res = client.get("/api/carbon/methodology")
    assert res.status_code == 200
    data = res.json()

    assert data["methodologyTier"] == "Tier 1 / indicative"
    assert len(data["registeredFactors"]) >= 4


def test_api_carbon_uncertainty_endpoint():
    """Verify GET /api/carbon/uncertainty response."""
    res = client.get("/api/carbon/uncertainty?village_id=gosaba&year=2025")
    assert res.status_code == 200
    data = res.json()

    assert data["villageId"] == "gosaba"
    assert "uncertainty" in data
    assert "carbonRange" in data["uncertainty"]


def test_api_carbon_change_endpoint():
    """Verify GET /api/carbon/change response."""
    res = client.get("/api/carbon/change?village_id=gosaba&from_year=2020&to_year=2025")
    assert res.status_code == 200
    data = res.json()

    assert data["villageId"] == "gosaba"
    assert data["fromYear"] == 2020
    assert data["toYear"] == 2025
    assert "carbonStockChangeMgC" in data
    assert "grossCarbonLossMgC" in data
    assert "grossCarbonGainMgC" in data
    assert "annualizedStockChangeMgC" in data


def test_api_carbon_validation_errors():
    """Verify 422 on missing village and 400 on invalid years."""
    res_no_village = client.get("/api/carbon")
    assert res_no_village.status_code == 422

    res_bad_years = client.get("/api/carbon/change?village_id=gosaba&from_year=2025&to_year=2020")
    assert res_bad_years.status_code == 400
