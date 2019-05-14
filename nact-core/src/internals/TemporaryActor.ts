export class TemporaryActor<Msg>  {
  constructor(
    public readonly dispatch: (message: Msg) => void,
  ) {}
}
