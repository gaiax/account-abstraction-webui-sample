import { ButtonHTMLAttributes, DetailedHTMLProps } from "react";
import { Box } from "../../styled-system/jsx";
import { css } from "../../styled-system/css";

type ButtonProps = DetailedHTMLProps<
  ButtonHTMLAttributes<HTMLButtonElement>,
  HTMLButtonElement
> & {
  children: React.ReactNode;
};

const Button = ({ children, ...props }: ButtonProps) => (
  <button
    {...props}
    className={css({
      px: "3",
      py: "1",
      bgColor: "neutral.100",
      borderColor: "neutral.500",
      borderWidth: "2px",
      borderStyle: "solid",
      borderRadius: "md",
      fontWeight: "medium",
      _hover: {
        cursor: "pointer",
        backgroundColor: "neutral.50",
      },
    })}
  >
    {children}
  </button>
);

export default Button;
