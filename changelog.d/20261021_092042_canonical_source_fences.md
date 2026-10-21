Fence all complete canonical candidate producer inputs and observed outputs after
late source-generation callbacks, without changing generated codec bytes or
original Hash call sites. Prevent a late Array iterator hook from observing
private guard arrays before fallback. Add five complete source/observation
controls and document exact current trial composition. All new checks unrun.
