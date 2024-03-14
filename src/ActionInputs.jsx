import { Button, ButtonGroup } from "@chakra-ui/react";

/* eslint-disable react/prop-types */
function ActionInputs({ onSave, onReset }) {
  return (
    <ButtonGroup className="action-inputs" m={[2, 3]}>
      <Button
        variant='primary'
        onClick={onSave}
      >
        Save
      </Button>
      <Button 
        variant='primary'
        onClick={onReset}
      >
        Reset
      </Button>
    </ButtonGroup>
  );
}

export default ActionInputs;
