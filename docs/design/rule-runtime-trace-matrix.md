# Rule Runtime Trace Matrix

| Rule Area | Runtime Evidence |
|---|---|
| Dream Law surfaces | `visibleTextSurfaces[].dreamLawIds` in ObservationFrame |
| Cover Tests | `visibleTextSurfaces[].coverTestIds` and domain events |
| Exposure | `ObservationFrame.exposure` |
| Station intake | `ObservationFrame.station.intakeOpen` and domain events |
| Inquest | `ObservationFrame.station.inquestOpen` |
| Verdict | `ObservationFrame.station.verdictReady` and Evidence why-lines |
| Session termination | `ObservationFrame.station.sessionTerminationAllowed` |
| Fallback Path | `fallback_selected` Evidence event |
