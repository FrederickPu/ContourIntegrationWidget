import ProofWidgets.Component.HtmlDisplay

import Lean.Data.HashMap
import Lean.Elab.Tactic
import ProofWidgets.Component.PenroseDiagram
import ProofWidgets.Component.HtmlDisplay
import ProofWidgets.Component.Panel.Basic
import ProofWidgets.Component.OfRpcMethod
import ProofWidgets.Component.MakeEditLink

open Lean ProofWidgets
open scoped ProofWidgets.Jsx

structure point where
  x : Float
  y : Float
  deriving ToJson, FromJson
structure line where
  label : String
  startPoint : point
  endPoint : point
  deriving ToJson, FromJson
structure arc where
  label : String
  center : point
  radius : Float
  startAngle : Float
  endAngle : Float
  deriving ToJson, FromJson
structure ContourProps where
  width : Float := 120
  height : Float := 70
  margin : Float := 10
  nodes : Array point := #[]
  edges : Array line := #[]
  arcs : Array arc := #[]
  selectedLabels : Option (Array String) := none
    deriving ToJson, FromJson, Inhabited

@[widget_module]
def Contour : Component ContourProps where
  javascript := include_str ".." / ".." / ".lake" / "build" / "js" / "contour.js"

#html <Contour nodes = {#[⟨20, 20⟩, ⟨4.5, 6.0⟩]} edges = {#[⟨"klj", ⟨10, 10⟩, ⟨500, 10⟩⟩, ⟨"kl", ⟨10, 10⟩, ⟨10, 500⟩⟩]} arcs = {#[⟨"l", ⟨500, 10⟩, 10, 0, 3.14 * 2⟩, ⟨"h7", ⟨500 - 20, 10⟩, 40, 0, 3.14⟩]} selectedLabels={#["klj"]}/>
#eval ToJson.toJson ({nodes := #[⟨20, 20⟩, ⟨4.5, 6.0⟩], edges := #[⟨"", ⟨10, 10⟩, ⟨500, 10⟩⟩], arcs := #[⟨"lkj", ⟨500, 10⟩, 10, 0, 3.14 * 2⟩, ⟨"h7", ⟨500 - 20, 10⟩, 20, 0, 3.14⟩]} : ContourProps)
-- #eval ToJson.toJson ({nodes := #[⟨3.0, 5.0⟩, ⟨4.5, 6.0⟩], edges := #[⟨⟨1.0, 2.0⟩, ⟨50, 50⟩⟩], arcs := #[]} : ContourProps)

----------

-- def isPoint? (e : Expr) : Bool :=
--   e.isAppOf ``point

def constName? : Expr → Option Name
  | const n _ => some n
  | _         => none

/-- If the expression is a constant, return that name. Otherwise return `Name.anonymous`. -/
def Lean.Expr.constName (e : Expr) : Name :=
  e.constName?.getD Name.anonymous

/-- Return the function (name) and arguments of an application. -/
def Lean.Expr.getAppFnArgs (e : Expr) : Name × Array Expr :=
  Lean.Expr.withApp e λ e a => (e.constName, a)

/--
  Return `some n` if `e` is one of the following
  - A nat literal (numeral)
  - `Nat.zero`
  - `Nat.succ x` where `isNumeral x`
  - `OfNat.ofNat _ x _` where `isNumeral x` -/
partial def Lean.Expr.numeral? (e : Expr) : Option Nat :=
  if let some n := e.natLit? then n
  else
    let f := e.getAppFn
    if !f.isConst then none
    else
      let fName := f.constName!
      if fName == ``Nat.succ && e.getAppNumArgs == 1 then (numeral? e.appArg!).map Nat.succ
      else if fName == ``OfNat.ofNat && e.getAppNumArgs == 3 then numeral? (e.getArg! 1)
      else if fName == ``Nat.zero && e.getAppNumArgs == 0 then some 0
      else none

def Line (a b : Nat × Nat) : Nat → Nat × Nat := fun t => ((1 - t) * a.1 + b.1, (1 - t) * a.2 + b.2)
def Arc (c : Nat × Nat) (R α β : Nat) : Nat → Nat × Nat := sorry

partial def isLine (e : Expr) : Option ((Nat × Nat) × (Nat × Nat)) :=
  match e.getAppFnArgs with
  | (``Line, #[e1, e2]) =>
    match e1.getAppFnArgs, e2.getAppFnArgs with
    | (``Prod.mk, #[_, _, a, b]), (``Prod.mk, #[_, _, c, d]) =>
      match a.numeral?, b.numeral?, c.numeral?, d.numeral? with
      | some a', some b', some c', some d' =>
        some ((a', b'), c', d')
      | _, _, _, _ => none
    | _, _ => none
  | _ => none

partial def isArc (e : Expr) : Option ((Nat × Nat) × Nat × Nat × Nat) :=
  match e.getAppFnArgs with
  | (``Arc, #[e1, e2, e3, e4]) =>
    match e1.getAppFnArgs with
    | (``Prod.mk, #[_, _, a, b]) =>
      match a.numeral?, b.numeral?, e2.numeral?, e3.numeral?, e4.numeral? with
      | some a', some b', some c', some d', some e' =>
        some ((a', b'), c', d', e')
      | _, _, _, _, _ => none
    | _ => none
  | _ => none


open Lean Meta Server
open scoped Jsx in
@[server_rpc_method]
def ContourVis.rpc (props : PanelWidgetProps) : RequestM (RequestTask Html) :=
  RequestM.asTask do
    let doc ← RequestM.readDoc
    let inner : Html ← (do
      -- Are there any goals unsolved? If so, pick the first one.
      if props.goals.isEmpty then
        return <span>No goals.</span>
      let some g := props.goals[0]? | unreachable!

      -- Execute the next part using the metavariable context and local context of the goal.
      g.ctx.val.runMetaM {} do

        let md ← g.mvarId.getDecl
        let lctx := md.lctx |>.sanitizeNames.run' {options := (← getOptions)}
        Meta.withLCtx lctx md.localInstances do
          let mut lines : List line := []
          let mut arcs : List arc := []

          -- Grab all hypotheses from the local context.
          let allHyps := (← getLCtx).decls.toArray.filterMap id
          for h in allHyps do
            if ! h.isLet then
              continue
            let tp ← instantiateMVars h.value
            match isArc tp with
            | some ⟨⟨a, b⟩, c, d, e⟩ =>
              arcs := ⟨h.userName.toString, ⟨a.toFloat, b.toFloat⟩, c.toFloat, d.toFloat, e.toFloat⟩ :: arcs
            | none => pure ()
            match isLine tp with
            | some ⟨⟨a, b⟩, ⟨c, d⟩⟩ =>
              lines := ⟨h.userName.toString, ⟨a.toFloat, b.toFloat⟩, ⟨c.toFloat, d.toFloat⟩⟩ :: lines
            | none => pure ()
          return <Contour edges={lines.toArray} arcs={arcs.toArray}/>
      )
    return (<details «open»={true}>
        <summary className="mv2 pointer">Contour Visualization</summary>
        <div className="ml1">{inner}</div>
      </details>)

@[widget_module]
def ContourVis : Component PanelWidgetProps :=
  mk_rpc_widget% ContourVis.rpc

example {α : Type} : 2 + 2 = 5 := by
  with_panel_widgets [ContourVis]
  let bruh := Line (0, 0) (100, 0)
  let bruh2 := Line (100, 0) (100, 100)
  let bruh3 := Line (100, 100) (0, 100)
  let bruh4 := Line (0, 100) (0, 0)
  let alskdjasldjkal := Arc (100, 0) 50 270 0
  let lol := Arc (100, 0) 50 0 90
  let wow := 2 + 2 = 4
