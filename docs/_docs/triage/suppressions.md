---
title: Global Suppression
category: Triage Results
chapter: 4
order: 1
---

Dependency-Track integrates the same mechanisms as Dependency-Check in identifying vulnerabilities and suppressing them.

Dependency-Track checks for the existence of a global suppression file.

> ~/.dependency-track/dependency-check/suppressions.xml

If this file exists, it will be used during global analysis. Note: this is a global suppression file. All components 
defined in the system, regardless of what projects they are a dependency of, will be affected by global suppression. 
In cases where there are clear false positives, global suppression will result in the vulnerability being suppressed 
across all projects. In cases where components are identified correctly (true positive) but the vulnerability may not
affect a specific project due to the way it's used, use of global suppressions are **not recommended**.

Refer to the Dependency-Check suppression documentation for further details.

> <https://jeremylong.github.io/DependencyCheck/general/suppression.html>