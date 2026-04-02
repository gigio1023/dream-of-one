// Assets/Tests/EditMode/NPCStateMachineTests.cs
using NUnit.Framework;

public class NPCStateMachineTests
{
    class CountingState : INPCState
    {
        public int EnterCount;
        public int ExecuteCount;
        public int ExitCount;
        public void Enter() => EnterCount++;
        public void Execute(float dt) => ExecuteCount++;
        public void Exit() => ExitCount++;
    }

    [Test]
    public void ChangeState_CallsEnterOnNew()
    {
        var fsm = new SimpleStateMachine();
        var state = new CountingState();
        fsm.ChangeState(state);
        Assert.AreEqual(1, state.EnterCount);
    }

    [Test]
    public void ChangeState_CallsExitOnPrevious()
    {
        var fsm = new SimpleStateMachine();
        var first = new CountingState();
        var second = new CountingState();
        fsm.ChangeState(first);
        fsm.ChangeState(second);
        Assert.AreEqual(1, first.ExitCount);
    }

    [Test]
    public void Update_CallsExecuteOnCurrent()
    {
        var fsm = new SimpleStateMachine();
        var state = new CountingState();
        fsm.ChangeState(state);
        fsm.Update(0.016f);
        fsm.Update(0.016f);
        Assert.AreEqual(2, state.ExecuteCount);
    }

    [Test]
    public void ChangeState_ToSame_DoesNothing()
    {
        var fsm = new SimpleStateMachine();
        var state = new CountingState();
        fsm.ChangeState(state);
        fsm.ChangeState(state);
        Assert.AreEqual(1, state.EnterCount);
        Assert.AreEqual(0, state.ExitCount);
    }
}
