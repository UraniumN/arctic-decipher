import { useState, useEffect } from "react";
import { Rail, type NavView } from "./components/Rail";
import { TopBar } from "./components/TopBar";
import { FilterBar } from "./components/FilterBar";
import { ChainCard } from "./components/ChainCard";
import { CanaryCard } from "./components/CanaryCard";
import { SuspectsCard } from "./components/SuspectsCard";
import { TimelineCard } from "./components/TimelineCard";
import { ConfigDrawer } from "./components/ConfigDrawer";

// Screen 1 Components
import { CasesTable } from "./components/CasesTable";
import { NewCaseCard } from "./components/NewCaseCard";

// Screen 2 Components
import { LogHeader } from "./components/LogHeader";
import { EventTable } from "./components/EventTable";
import { EventDetail } from "./components/EventDetail";

// Screen 3 Components
import { ChainHeader } from "./components/ChainHeader";
import { SummaryCard } from "./components/SummaryCard";
import { SequenceStrip } from "./components/SequenceStrip";
import { FindingsList } from "./components/FindingsList";
import { ContextRows } from "./components/ContextRows";

// Screen 4 Components
import { CustodianHeader } from "./components/CustodianHeader";
import { IdentityTable } from "./components/IdentityTable";
import { RevealLog } from "./components/RevealLog";

import {
  Config,
  defaultConfig,
  runInvestigation,
  verifyChain,
  revealCustodian,
  checkConnectivity,
} from "./api";
import {
  suspects as mockSuspects,
  events,
  findings,
  type Suspect,
  type Action,
} from "./data";

export function App() {
  const [activeView, setActiveView] = useState<NavView>("cases");
  const [config, setConfig] = useState<Config>(defaultConfig);
  const [configOpen, setConfigOpen] = useState(false);
  const [connected, setConnected] = useState(true);
  const [loading, setLoading] = useState(false);

  // Investigation view state
  const [currentDataId, setCurrentDataId] = useState("S1001");
  const [currentExposure, setCurrentExposure] = useState("public_bucket");
  const [suspectsList, setSuspectsList] = useState<Suspect[]>(mockSuspects);
  const [selectedSuspect, setSelectedSuspect] = useState<string>(mockSuspects[0].id);
  const [revealed, setRevealed] = useState(false);
  const [custodianMap, setCustodianMap] = useState<Record<string, string>>({});
  const [canary, setCanary] = useState<{ token: string; owner: string } | null>({
    token: "tok_ab12cd",
    owner: "p_a3f9c2d1e4",
  });

  // Event Log view state (Screen 2)
  const [logAction, setLogAction] = useState<Action | "all">("all");
  const [logSearch, setLogSearch] = useState("");
  const [selectedEventSeq, setSelectedEventSeq] = useState<number>(1186);

  // Chain view state (Screen 3)
  const [selectedFindingId, setSelectedFindingId] = useState(findings[0].id);
  const [chainInfo, setChainInfo] = useState<{
    eventsCount: number;
    missingCount: number;
    missingAfter?: number;
    editedCount: number;
    verifiedAt: string;
  }>({
    eventsCount: 1284,
    missingCount: 3,
    missingAfter: 1182,
    editedCount: 0,
    verifiedAt: "2 min ago",
  });

  // Check connectivity on startup and sync live data
  useEffect(() => {
    loadLiveData();
  }, [config]);

  const loadLiveData = async () => {
    try {
      const conn = await checkConnectivity(config);
      setConnected(conn.tracer);

      if (conn.tracer && conn.db) {
        // 1. Verify chain
        try {
          const v = await verifyChain(config);
          const missing = v.gaps.reduce((acc, g) => acc + g.missing, 0);
          setChainInfo({
            eventsCount: v.events,
            missingCount: missing,
            missingAfter: v.gaps[0]?.after,
            editedCount: v.edited_seqs.length,
            verifiedAt: "Just now",
          });
        } catch (e) {
          console.warn("verifyChain failed:", e);
        }

        // 2. Run investigation
        try {
          const inv = await runInvestigation(config, currentDataId, currentExposure);
          if (inv.suspects && inv.suspects.length > 0) {
            setSuspectsList(inv.suspects);
            setSelectedSuspect(inv.suspects[0].id);
          }
          if (inv.canary) {
            setCanary(inv.canary);
          }
        } catch (e) {
          console.warn("runInvestigation failed:", e);
        }
      }
    } catch (e) {
      setConnected(false);
    }
  };

  const handleRevealToggle = async () => {
    const next = !revealed;
    setRevealed(next);

    if (next && Object.keys(custodianMap).length === 0) {
      try {
        const map = await revealCustodian(config);
        setCustodianMap(map);
      } catch (err) {
        console.warn("Custodian reveal failed, falling back to mock names:", err);
      }
    }
  };

  const handleRerunInvestigation = async () => {
    setLoading(true);
    try {
      const inv = await runInvestigation(config, currentDataId, currentExposure);
      if (inv.suspects && inv.suspects.length > 0) {
        setSuspectsList(inv.suspects);
        setSelectedSuspect(inv.suspects[0].id);
      }
      if (inv.canary) {
        setCanary(inv.canary);
      }
    } catch (e) {
      console.warn("Rerun investigation failed, using local fallback:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCase = (dataId: string) => {
    setCurrentDataId(dataId);
    if (dataId === "S1017") setCurrentExposure("pastebin_mirror");
    else if (dataId === "S0987") setCurrentExposure("email_relay");
    else if (dataId === "S0950") setCurrentExposure("forum_post");
    else setCurrentExposure("public_bucket");
    setActiveView("investigate");
  };

  const handleNewCaseInvestigate = (dataId: string, exposure: string, text: string) => {
    setCurrentDataId(dataId);
    setCurrentExposure(exposure);
    // If text contains canary token or note_ref, update canary
    const match = text.match(/"note_ref":\s*"([^"]+)"/);
    if (match) {
      setCanary({ token: match[1], owner: "p_a3f9c2d1e4" });
    }
    setActiveView("investigate");
  };

  const tracerHost = (() => {
    try {
      const u = new URL(config.tracerUrl);
      return u.host;
    } catch {
      return "localhost:8000";
    }
  })();

  const currentFinding = findings.find((f) => f.id === selectedFindingId) ?? findings[0];
  const currentEvent = events.find((e) => e.seq === selectedEventSeq) ?? events[0];

  return (
    <div className="flex h-screen w-full overflow-hidden bg-bg text-ink">
      <Rail
        activeView={activeView}
        onNavigate={setActiveView}
        onOpenConfig={() => setConfigOpen(true)}
        onNewCase={() => setActiveView("cases")}
      />

      <div className="flex min-w-0 flex-1 flex-col px-6 pb-6">
        <TopBar
          connected={connected}
          tracerHost={tracerHost}
          activeView={activeView}
          onNavigate={setActiveView}
        />

        {/* ─── SCREEN 1: CASES ────────────────────────────────────────── */}
        {activeView === "cases" && (
          <div className="flex min-h-0 flex-1 flex-col">
            <h1 className="mb-5 font-display text-[40px] font-bold uppercase leading-none tracking-tight">
              Cases
            </h1>
            <main className="grid min-h-0 flex-1 grid-cols-12 gap-4">
              <div className="col-span-9 min-h-0">
                <CasesTable onSelectCase={handleSelectCase} />
              </div>
              <div className="col-span-3 min-h-0">
                <NewCaseCard onInvestigate={handleNewCaseInvestigate} />
              </div>
            </main>
          </div>
        )}

        {/* ─── SCREEN 2: EVENT LOG ────────────────────────────────────── */}
        {activeView === "events" && (
          <div className="flex min-h-0 flex-1 flex-col">
            <LogHeader
              action={logAction}
              onAction={setLogAction}
              search={logSearch}
              onSearch={setLogSearch}
            />
            <main className="grid min-h-0 flex-1 grid-cols-12 gap-4">
              <div className="col-span-8 min-h-0">
                <EventTable
                  action={logAction}
                  search={logSearch}
                  selected={selectedEventSeq}
                  onSelect={setSelectedEventSeq}
                />
              </div>
              <div className="col-span-4 min-h-0">
                {currentEvent && <EventDetail event={currentEvent} />}
              </div>
            </main>
          </div>
        )}

        {/* ─── SCREEN 3: CHAIN VERIFICATION ──────────────────────────── */}
        {activeView === "chain" && (
          <div className="flex min-h-0 flex-1 flex-col">
            <ChainHeader
              verifiedAt={chainInfo.verifiedAt}
              onVerify={async () => {
                setLoading(true);
                try {
                  const v = await verifyChain(config);
                  const missing = v.gaps.reduce((acc, g) => acc + g.missing, 0);
                  setChainInfo({
                    eventsCount: v.events,
                    missingCount: missing,
                    missingAfter: v.gaps[0]?.after,
                    editedCount: v.edited_seqs.length,
                    verifiedAt: "Just now",
                  });
                } catch (e) {
                  console.warn("Chain verify failed:", e);
                } finally {
                  setLoading(false);
                }
              }}
              verifying={loading}
            />
            <main className="grid min-h-0 flex-1 grid-cols-12 grid-rows-[184px_1fr] gap-4">
              <div className="col-span-4">
                <SummaryCard
                  eventsCount={chainInfo.eventsCount}
                  missingCount={chainInfo.missingCount}
                  editedCount={chainInfo.editedCount}
                />
              </div>
              <div className="col-span-8">
                <SequenceStrip
                  selected={selectedFindingId}
                  onSelect={setSelectedFindingId}
                />
              </div>
              <div className="col-span-4 min-h-0">
                <FindingsList
                  selected={selectedFindingId}
                  onSelect={setSelectedFindingId}
                />
              </div>
              <div className="col-span-8 min-h-0">
                <ContextRows finding={currentFinding} />
              </div>
            </main>
          </div>
        )}

        {/* ─── SCREEN 4: CUSTODIAN REVEAL ────────────────────────────── */}
        {activeView === "custodian" && (
          <div className="flex min-h-0 flex-1 flex-col">
            <CustodianHeader
              revealed={revealed}
              onToggle={handleRevealToggle}
            />
            <main className="grid min-h-0 flex-1 grid-cols-12 gap-4">
              <div className="col-span-8 min-h-0">
                <IdentityTable
                  revealed={revealed}
                  custodianMap={custodianMap}
                  onSelectCase={handleSelectCase}
                />
              </div>
              <div className="col-span-4 min-h-0">
                <RevealLog />
              </div>
            </main>
          </div>
        )}

        {/* ─── INVESTIGATION SCREEN ───────────────────────────────────── */}
        {activeView === "investigate" && (
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pr-1">
            <FilterBar
              onOpenConfig={() => setConfigOpen(true)}
              onRerun={handleRerunInvestigation}
              loading={loading}
              dataId={currentDataId}
              exposure={currentExposure}
              suspectCount={suspectsList.length}
            />
            <main className="grid min-h-[580px] flex-1 grid-cols-12 gap-4 pb-2">
              <div className="col-span-7 grid min-h-0 grid-rows-[208px_1fr] gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <ChainCard
                    eventsCount={chainInfo.eventsCount}
                    missingCount={chainInfo.missingCount}
                    missingAfter={chainInfo.missingAfter}
                    editedCount={chainInfo.editedCount}
                  />
                  <CanaryCard canary={canary} />
                </div>
                <SuspectsCard
                  suspectsList={suspectsList}
                  selected={selectedSuspect}
                  onSelect={setSelectedSuspect}
                  revealed={revealed}
                  onReveal={handleRevealToggle}
                  custodianMap={custodianMap}
                />
              </div>
              <div className="col-span-5 min-h-0">
                <TimelineCard
                  selected={selectedSuspect}
                  onSelect={setSelectedSuspect}
                />
              </div>
            </main>
          </div>
        )}
      </div>

      <ConfigDrawer
        open={configOpen}
        onClose={() => setConfigOpen(false)}
        config={config}
        onConfigChange={setConfig}
        onReverify={loadLiveData}
      />
    </div>
  );
}
