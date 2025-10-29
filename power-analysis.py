#!/usr/bin/env python3

# Copyright (C) 2025 Apple Inc. All rights reserved.
#
# Redistribution and use in source and binary forms, with or without
# modification, are permitted provided that the following conditions
# are met:
# 1.  Redistributions of source code must retain the above copyright
#     notice, this list of conditions and the following disclaimer.
# 2.  Redistributions in binary form must reproduce the above copyright
#     notice, this list of conditions and the following disclaimer in the
#     documentation and/or other materials provided with the distribution.
#
# THIS SOFTWARE IS PROVIDED BY APPLE INC. AND ITS CONTRIBUTORS ``AS IS'' AND ANY
# EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
# WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
# DISCLAIMED. IN NO EVENT SHALL APPLE INC. OR ITS CONTRIBUTORS BE LIABLE FOR ANY
# DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
# (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
# LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
# ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
# (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
# SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

"""
Statistical power analysis for JetStream3 benchmark data.

This script computes power analysis for each line item and category in the benchmark,
reporting the detectable percentage change given the sample sizes and variability.
"""

import argparse
import json
import sys
from pathlib import Path
from typing import Dict, List
import numpy as np
from numpy import array
from scipy import stats
from statsmodels.stats.power import TTestIndPower


def load_benchmark_data(file_paths: List[str]) -> List[Dict]:
    """Load benchmark data from multiple JSON files."""
    data = []
    for file_path in file_paths:
        try:
            with open(file_path, 'r') as f:
                data.append(json.load(f))
        except FileNotFoundError:
            print(f"Error: File not found: {file_path}", file=sys.stderr)
            sys.exit(1)
        except json.JSONDecodeError as e:
            print(f"Error: Invalid JSON in {file_path}: {e}", file=sys.stderr)
            sys.exit(1)
    return data


def aggregate_samples(benchmark_runs: List[Dict], line_item: str, category: str) -> List[float]:
    """Aggregate all samples for a specific line item and category across all runs."""
    samples = []
    for run in benchmark_runs:
        if line_item in run:
            if category in run[line_item]:
                if type(run[line_item][category]) is list:
                    samples.extend(run[line_item][category])
                else:
                    samples.append(run[line_item][category])
    return samples


def calculate_detectable_effect(n: int, alpha: float, power: float, std: float, mean: float) -> Dict:
    """
    Calculate the minimum detectable effect size and percentage change.

    Uses scipy to compute the required effect size for a two-tailed t-test
    given sample size, significance level, and desired power.

    Args:
        n: Sample size
        alpha: Significance level (e.g., 0.05)
        power: Desired statistical power (e.g., 0.8)
        std: Standard deviation of the sample
        mean: Mean of the sample

    Returns:
        Dictionary with effect size and percentage change information
    """
    if n < 2:
        return {
            'effect_size': None,
            'detectable_change': None,
            'percentage_change': None,
            'error': 'Insufficient samples (n < 2)'
        }

    if std == 0:
        return {
            'effect_size': 0,
            'detectable_change': 0,
            'percentage_change': 0,
            'error': 'Zero variance in samples'
        }

    # For a two-tailed test, we need critical values
    # alpha/2 for each tail
    t_alpha = stats.t.ppf(1 - alpha/2, df=n-1)
    t_beta = stats.t.ppf(power, df=n-1)

    # Cohen's d (standardized effect size) for desired power
    # For a one-sample t-test (comparing to a baseline mean):
    # d = (t_alpha + t_beta) / sqrt(n)
    cohen_d = (t_alpha + t_beta) / np.sqrt(n)

    # Detectable difference in raw units
    detectable_change = cohen_d * std

    # Percentage change
    if mean != 0:
        percentage_change = (detectable_change / abs(mean)) * 100
    else:
        percentage_change = None

    return {
        'effect_size': cohen_d,
        'coefficient_of_variation': coefficient_of_variation,
        'percentage_change': percentage_change,
        'error': None
    }


def perform_power_analysis(benchmark_runs: List[Dict], alpha: float, power: float, detectable_change: float) -> Dict:
    """
    Perform power analysis for all line items and categories.

    Args:
        benchmark_runs: List of benchmark run data
        alpha: Significance level
        detectable_change: Desired detectable change as a % from the mean

    Returns:
        Dictionary containing analysis results for each line item and category
    """
    results = {}

    # Collect all unique line items and categories
    line_items = set()
    for run in benchmark_runs:
        line_items.update(run.keys())

    for line_item in line_items:
        # Collect all categories for this line item
        categories = set()
        for run in benchmark_runs:
            if type(run[line_item]) is dict:
                categories.update(run[line_item].keys())

        results[line_item] = {}

        for category in categories:
            # Aggregate all samples for this line item and category
            samples = aggregate_samples(benchmark_runs, line_item, category)

            if not samples:
                results[line_item][category] = {
                    'n': 0,
                    'mean': None,
                    'std': None,
                    'error': 'No samples found'
                }
                continue

            # Calculate statistics
            n = len(samples)
            mean = np.mean(samples)
            std = np.std(samples, ddof=1)  # Sample standard deviation

            coefficient_of_variation_samples = (std / mean * 100)

            # https://lbecker.uccs.edu/effect-size has a good description of Cohen's d to sample group overlap %, which helped validate the numbers here.
            effect = (detectable_change * mean - mean) / std
            # effect = ((mean_sampled - mean_true) / std_true
            # perform power analysis
            analysis = TTestIndPower()
            if effect < 5.5:
                result = analysis.solve_power(effect, power=power, nobs1=None, ratio=1.0, alpha=alpha)
            else:
                result = 1

            # Calculate detectable effect
            # effect_info = calculate_detectable_effect(n, alpha, power, std, mean)

            results[line_item][category] = {
                'n': n,
                'mean': mean,
                'std': std,
                'effect': effect,
                'cv': coefficient_of_variation_samples,  # Coefficient of variation
                'result': result,
            }

    return results


def format_output(results: Dict, alpha: float, power: float):
    """Format and print the power analysis results."""
    print("=" * 100)
    print(f"JetStream3 Benchmark Power Analysis")
    print(f"Significance Level (α): {alpha}")
    print(f"Statistical Power: {power}")
    print("=" * 100)
    print()

    for line_item in sorted(results.keys()):
        print(f"\n{line_item}")
        print("-" * 100)

        for category in sorted(results[line_item].keys()):
            data = results[line_item][category]

            print(f"\n  Category: {category}")
            print(f"    Sample size (n): {data['n']}")

            if data.get('error'):
                print(f"    Error: {data['error']}")
                continue

            print(f"    Mean: {data['mean']:.4f}")
            print(f"    Std Dev: {data['std']:.4f}")
            print(f"    CV: {data['cv']:.2f}%")
            print(f"    Effect Size (Cohen's d): {data['effect']:.3f}")

            print(f"    Sample size needed: {data['result']:.3f}")

            # if data['effect_size'] is not None:
            #     print(f"    Cohen's d (effect size): {data['effect_size']:.4f}")

            # if data['detectable_change'] is not None:
            #     print(f"    Detectable change: ±{data['detectable_change']:.4f}")

            # if data['percentage_change'] is not None:
            #     print(f"    Detectable % change: ±{data['percentage_change']:.2f}%")
            if data.get('error'):
                print(f"    Note: {data['error']}")

        print()

    print("=" * 100)


def main():
    parser = argparse.ArgumentParser(
        description='Perform statistical power analysis on JetStream3 benchmark data.',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s run1.json run2.json run3.json
  %(prog)s --alpha 0.01 --power 0.9 *.json
        """
    )

    parser.add_argument(
        'files',
        nargs='+',
        help='JSON files containing benchmark run data'
    )

    parser.add_argument(
        '--alpha',
        type=float,
        default=0.05,
        help='Significance level (default: 0.05)'
    )

    parser.add_argument(
        '--power',
        type=float,
        default=0.8,
        help='Desired statistical power (default: 0.8)'
    )

    parser.add_argument(
        '--detectable-change',
        type=float,
        default=1.005,
        help='Desired detectable change as a multiple of the mean (default: 1.005)'
    )

    args = parser.parse_args()

    # Validate parameters
    if not 0 < args.alpha < 1:
        print("Error: alpha must be between 0 and 1", file=sys.stderr)
        sys.exit(1)

    if not 0 < args.power < 1:
        print("Error: power must be between 0 and 1", file=sys.stderr)
        sys.exit(1)

    # Load benchmark data
    benchmark_runs = load_benchmark_data(args.files)

    if not benchmark_runs:
        print("Error: No benchmark data loaded", file=sys.stderr)
        sys.exit(1)

    print(f"Loaded {len(benchmark_runs)} benchmark run(s)\n")

    # Perform power analysis
    results = perform_power_analysis(benchmark_runs, args.alpha, args.power, args.detectable_change)

    # Display results
    format_output(results, args.alpha, args.power)


if __name__ == '__main__':
    main()
