import { css } from "../../styled-system/css";
import { Container, Box } from "../../styled-system/jsx";

export default function Home() {
  return (
    <Container>
      <Box py={"4"}>
        <h1
          className={css({
            textAlign: "center",
            fontSize: "2rem",
            fontWeight: "bold",
          })}
        >
          Account Abstraction Demo
        </h1>
      </Box>
    </Container>
  );
}
