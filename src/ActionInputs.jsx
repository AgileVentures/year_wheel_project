import { Container, Button } from "@chakra-ui/react";

/* eslint-disable react/prop-types */
function ActionInputs({ onSave, onReset }) {
  return (
    <Container className="action-inputs">
      <Button colorScheme='purple' onClick={onSave}>Save</Button>
      <Button colorScheme='purple' onClick={onReset}>Reset</Button>
    </Container>
  );
}

export default ActionInputs;
