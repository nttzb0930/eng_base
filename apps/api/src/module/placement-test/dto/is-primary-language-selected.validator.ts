import {
  registerDecorator,
  type ValidationArguments,
  type ValidationOptions,
} from "class-validator";

type LanguageSelection = {
  languages?: unknown;
};

export function IsPrimaryLanguageSelected(
  validationOptions?: ValidationOptions
) {
  return (target: object, propertyName: string) => {
    registerDecorator({
      name: "isPrimaryLanguageSelected",
      target: target.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          if (value === undefined || value === null) return true;

          const { languages } = args.object as LanguageSelection;
          return Array.isArray(languages) && languages.includes(value);
        },
        defaultMessage() {
          return "primaryLanguage must be included in languages";
        },
      },
    });
  };
}
