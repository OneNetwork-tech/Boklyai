"""AI Services for BoklyAI.

This module exposes lightweight, dependency-free helpers that power
smart categorisation, document intelligence, predictive analytics and
anomaly detection for the Swedish bookkeeping workflow.  While the
implementation intentionally favours rule-based heuristics (to avoid
external model dependencies inside this offline snapshot), each class
mirrors the contract that the production machine learning pipelines
will implement.
"""

from __future__ import annotations

import argparse
import json
import statistics
from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, Iterable, List, Optional, Tuple

SWEDISH_KEYWORDS: Dict[str, Tuple[str, ...]] = {
    "RENT": ("hyra", "rent"),
    "SALARY": ("lön", "salary", "payroll"),
    "VAT": ("moms", "vat"),
    "MARKETING": ("annonser", "facebook", "google"),
    "UTILITIES": ("el", "vatten", "bredband"),
    "SALES": ("försäljning", "invoice", "intäkt"),
    "SUBSCRIPTION": ("licens", "subscription", "saas"),
}


@dataclass
class CategorisationResult:
    label: str
    confidence: float
    reasoning: str


class SmartCategorizer:
    """Simple keyword-based categoriser that mimics ML API shape."""

    def __init__(self, keyword_map: Optional[Dict[str, Tuple[str, ...]]] = None) -> None:
        self.keyword_map = keyword_map or SWEDISH_KEYWORDS

    def predict(self, description: str) -> CategorisationResult:
        description_lower = description.lower()
        best_label = "OTHER"
        best_score = 0.0
        best_keyword = None
        for label, keywords in self.keyword_map.items():
            hits = sum(1 for keyword in keywords if keyword in description_lower)
            if hits > best_score:
                best_label = label
                best_score = hits
                best_keyword = ", ".join(keyword for keyword in keywords if keyword in description_lower)
        confidence = min(1.0, 0.25 * best_score)
        reasoning = (
            f"Matched keywords: {best_keyword}" if best_keyword else "No strong keyword match; defaulting to OTHER"
        )
        return CategorisationResult(label=best_label, confidence=confidence, reasoning=reasoning)


@dataclass
class DocumentInsight:
    supplier: Optional[str]
    amount: Optional[float]
    currency: str = "SEK"
    invoice_date: Optional[datetime] = None
    vat_amount: Optional[float] = None
    metadata: Dict[str, str] = field(default_factory=dict)


class DocumentIntelligence:
    """Parses key fields from OCR-extracted text blocks."""

    def extract(self, text: str) -> DocumentInsight:
        amount = None
        vat_amount = None
        supplier = None
        invoice_date = None

        for line in text.splitlines():
            lower = line.lower()
            if "org.nr" in lower or "orgnr" in lower:
                supplier = line.strip()
            if "moms" in lower or "vat" in lower:
                vat_amount = _first_number(line)
            if "total" in lower or "belopp" in lower:
                amount = _first_number(line)
            if "datum" in lower:
                invoice_date = _first_date(line)

        return DocumentInsight(
            supplier=supplier,
            amount=amount,
            invoice_date=invoice_date,
            vat_amount=vat_amount,
            metadata={"lines": str(len(text.splitlines()))},
        )


@dataclass
class ForecastResult:
    next_month: float
    trend_slope: float
    average_growth: float


class RevenueForecaster:
    """Performs a naive Holt-Winters inspired forecast without dependencies."""

    def forecast(self, monthly_values: Iterable[float]) -> ForecastResult:
        values = list(monthly_values)
        if not values:
            return ForecastResult(next_month=0.0, trend_slope=0.0, average_growth=0.0)
        if len(values) == 1:
            return ForecastResult(next_month=values[0], trend_slope=0.0, average_growth=0.0)

        slope = (values[-1] - values[0]) / (len(values) - 1)
        growth_rates = [
            (values[i] - values[i - 1]) / values[i - 1] if values[i - 1] else 0.0
            for i in range(1, len(values))
        ]
        average_growth = statistics.mean(growth_rates) if growth_rates else 0.0
        next_month = values[-1] * (1 + average_growth) + slope
        return ForecastResult(next_month=round(next_month, 2), trend_slope=round(slope, 2), average_growth=round(average_growth, 4))


@dataclass
class AnomalyFlag:
    index: int
    value: float
    z_score: float


class AnomalyDetector:
    """Identifies high-variance anomalies using z-scores."""

    def detect(self, values: Iterable[float], threshold: float = 2.5) -> List[AnomalyFlag]:
        series = list(values)
        if len(series) < 2:
            return []
        mean = statistics.mean(series)
        stdev = statistics.pstdev(series)
        if stdev == 0:
            return []
        anomalies = []
        for index, value in enumerate(series):
            z_score = abs((value - mean) / stdev)
            if z_score >= threshold:
                anomalies.append(AnomalyFlag(index=index, value=value, z_score=round(z_score, 2)))
        return anomalies


def _first_number(text: str) -> Optional[float]:
    for token in text.replace(",", ".").split():
        try:
            return float(token)
        except ValueError:
            continue
    return None


def _first_date(text: str) -> Optional[datetime]:
    for fmt in ("%Y-%m-%d", "%Y/%m/%d", "%d-%m-%Y", "%d/%m/%Y"):
        for token in text.split():
            try:
                return datetime.strptime(token, fmt)
            except ValueError:
                continue
    return None


def run_cli() -> None:
    parser = argparse.ArgumentParser(description="Offline AI helpers for BoklyAI")
    subparsers = parser.add_subparsers(dest="command")

    categorise_parser = subparsers.add_parser("categorise", help="Categorise a transaction description")
    categorise_parser.add_argument("description", help="Transaction description to classify")

    extract_parser = subparsers.add_parser("extract", help="Extract fields from invoice text")
    extract_parser.add_argument("text", help="Raw text content from OCR or upload")

    forecast_parser = subparsers.add_parser("forecast", help="Forecast revenue based on comma separated values")
    forecast_parser.add_argument("values", help="Comma separated monthly revenue values in SEK")

    anomaly_parser = subparsers.add_parser("anomalies", help="Detect anomalies in numeric series")
    anomaly_parser.add_argument("values", help="Comma separated numeric values")
    anomaly_parser.add_argument("--threshold", type=float, default=2.5)

    args = parser.parse_args()

    if args.command == "categorise":
        result = SmartCategorizer().predict(args.description)
        print(json.dumps(result.__dict__, default=str, ensure_ascii=False))
    elif args.command == "extract":
        insight = DocumentIntelligence().extract(args.text)
        payload = insight.__dict__.copy()
        if insight.invoice_date:
            payload["invoice_date"] = insight.invoice_date.isoformat()
        print(json.dumps(payload, ensure_ascii=False))
    elif args.command == "forecast":
        values = [float(value.strip()) for value in args.values.split(',') if value.strip()]
        forecast_result = RevenueForecaster().forecast(values)
        print(json.dumps(forecast_result.__dict__, ensure_ascii=False))
    elif args.command == "anomalies":
        values = [float(value.strip()) for value in args.values.split(',') if value.strip()]
        anomalies = AnomalyDetector().detect(values, threshold=args.threshold)
        print(json.dumps([flag.__dict__ for flag in anomalies], ensure_ascii=False))
    else:
        parser.print_help()


def main() -> None:
    run_cli()


if __name__ == "__main__":
    main()
